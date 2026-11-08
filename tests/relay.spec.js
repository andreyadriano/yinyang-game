import { test, expect } from "@playwright/test";
import { startRelay } from "../server/relay.js";
import { WebSocketTransport } from "../src/net/WebSocketTransport.js";

// O servidor de repasse de verdade (Node + WebSocket) com dois clientes de verdade.
// Os clientes usam a mesma classe WebSocketTransport que o navegador usa.

let relay;
test.beforeAll(async () => {
  relay = await startRelay({ port: 0 });
});
test.afterAll(async () => {
  await relay.close();
});

const url = (room) => `ws://localhost:${relay.port}/room/${room}`;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Conecta e junta o que chegar.
async function join(room) {
  const transport = await WebSocketTransport.connect(url(room));
  const received = [];
  const closed = { value: false };
  transport.onMessage((m) => received.push(m));
  transport.onClose(() => (closed.value = true));
  return { transport, received, closed };
}

const until = async (condition, ms = 3000) => {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > ms) throw new Error("tempo esgotado");
    await wait(10);
  }
};

test("o primeiro a entrar é o anfitrião e é avisado quando o convidado chega", async () => {
  const host = await join("AAAB");
  await until(() => host.received.length >= 1);
  expect(host.received[0]).toEqual({ t: "joined", role: "host", room: "AAAB" });

  const guest = await join("AAAB");
  await until(() => guest.received.length >= 1 && host.received.length >= 2);
  expect(guest.received[0]).toEqual({ t: "joined", role: "guest", room: "AAAB" });
  expect(host.received[1]).toEqual({ t: "peer-joined" });
  host.transport.close();
  guest.transport.close();
});

test("as mensagens do jogo atravessam o servidor nos dois sentidos", async () => {
  const host = await join("AAAC");
  const guest = await join("AAAC");
  await until(() => host.received.length >= 2 && guest.received.length >= 1);

  guest.transport.send({ t: "intent", n: 6 });
  host.transport.send({ t: "snapshot", full: true, tick: 7, game: {}, entities: { "slime-0": { x: 1.5 } } });
  host.transport.send({ t: "sound", name: "jump", volume: 0.3 });
  await until(() => guest.received.length >= 3 && host.received.length >= 3);

  expect(host.received[2]).toEqual({ t: "intent", n: 6 });
  expect(guest.received.slice(1)).toEqual([
    { t: "snapshot", full: true, tick: 7, game: {}, entities: { "slime-0": { x: 1.5 } } },
    { t: "sound", name: "jump", volume: 0.3 },
  ]);
  host.transport.close();
  guest.transport.close();
});

test("quem manda não recebe a própria mensagem de volta", async () => {
  const host = await join("AAAD");
  const guest = await join("AAAD");
  await until(() => host.received.length >= 2 && guest.received.length >= 1);
  const before = guest.received.length;
  guest.transport.send({ t: "intent", n: 1 });
  await wait(150);
  expect(guest.received.length).toBe(before);
  host.transport.close();
  guest.transport.close();
});

test("um terceiro jogador é recusado com room-full", async () => {
  const host = await join("AAAE");
  const guest = await join("AAAE");
  await until(() => host.received.length >= 2 && guest.received.length >= 1);

  const third = await join("AAAE");
  await until(() => third.closed.value);
  expect(third.received).toEqual([{ t: "error", code: "room-full" }]);
  host.transport.close();
  guest.transport.close();
});

test("um código de sala inválido é recusado", async () => {
  const bad = await join("abc");
  await until(() => bad.closed.value);
  expect(bad.received).toEqual([{ t: "error", code: "bad-room" }]);
});

test("mensagens inválidas recebem erro e não chegam ao outro jogador", async () => {
  const host = await join("AAAF");
  const guest = await join("AAAF");
  await until(() => host.received.length >= 2 && guest.received.length >= 1);

  host.transport.socket.send("isto não é json");
  host.transport.socket.send(JSON.stringify({ t: "joined", role: "host" }));
  await until(() => host.received.filter((m) => m.t === "error").length >= 2);
  await wait(100);
  expect(guest.received).toHaveLength(1); // só o "joined"
  host.transport.close();
  guest.transport.close();
});

test("quando o convidado sai, o anfitrião é avisado e outro convidado pode entrar", async () => {
  const host = await join("AAAG");
  const guest = await join("AAAG");
  await until(() => host.received.length >= 2 && guest.received.length >= 1);

  guest.transport.close();
  await until(() => host.received.some((m) => m.t === "peer-left"));

  const next = await join("AAAG");
  await until(() => next.received.length >= 1);
  expect(next.received[0]).toMatchObject({ t: "joined", role: "guest" });
  host.transport.close();
  next.transport.close();
});

test("quando o anfitrião sai, o convidado é avisado e desconectado, e a sala some", async () => {
  const host = await join("AAAH");
  const guest = await join("AAAH");
  await until(() => host.received.length >= 2 && guest.received.length >= 1);

  host.transport.close();
  await until(() => guest.closed.value);
  expect(guest.received.some((m) => m.t === "peer-left")).toBe(true);
  await until(() => !relay.registry.rooms.has("AAAH"));
});

test("um snapshot grande (milhares de bytes) chega inteiro", async () => {
  const host = await join("AAAJ");
  const guest = await join("AAAJ");
  await until(() => host.received.length >= 2 && guest.received.length >= 1);

  const entities = {};
  for (let i = 0; i < 80; i++) entities[`slime-${i}`] = { x: i * 1.5, y: 350, vx: 0, vy: 0, anim: "slime-idle", health: 20 };
  const snapshot = { t: "snapshot", full: true, tick: 1, game: {}, entities };
  host.transport.send(snapshot);
  await until(() => guest.received.length >= 2);
  expect(guest.received[1]).toEqual(snapshot);
  host.transport.close();
  guest.transport.close();
});

test("conectar num endereço sem servidor falha com erro claro, sem travar", async () => {
  await expect(WebSocketTransport.connect("ws://localhost:1/room/ABCD", { timeoutMs: 1500 })).rejects.toThrow(/Could not connect/);
});

test("o endereço /health responde ok", async () => {
  const response = await fetch(`http://localhost:${relay.port}/health`);
  expect(await response.text()).toBe("ok");
});
