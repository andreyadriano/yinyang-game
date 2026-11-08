import { test, expect } from "@playwright/test";
import { WebSocketTransport } from "../../src/net/WebSocketTransport.js";

// O contrato do servidor de repasse: o que qualquer implementação (o servidor Node local e o
// Worker da Cloudflare) precisa fazer. Os dois rodam estes mesmos testes.

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const until = async (condition, ms = 5000) => {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > ms) throw new Error("tempo esgotado");
    await wait(10);
  }
};

// Conecta numa sala e vai juntando o que chega. `url(room)` dá o endereço do WebSocket.
export async function join(url, room) {
  const transport = await WebSocketTransport.connect(url(room));
  const received = [];
  const closed = { value: false };
  transport.onMessage((m) => received.push(m));
  transport.onClose(() => (closed.value = true));
  return { transport, received, closed };
}

// Abre uma sala com anfitrião e convidado e espera os dois estarem prontos.
export async function pairInRoom(url, room) {
  const host = await join(url, room);
  const guest = await join(url, room);
  await until(() => host.received.length >= 2 && guest.received.length >= 1);
  return { host, guest };
}

export function defineRelayContract(url) {
  test("o primeiro a entrar é o anfitrião e é avisado quando o convidado chega", async () => {
    const host = await join(url, "AAAB");
    await until(() => host.received.length >= 1);
    expect(host.received[0]).toEqual({ t: "joined", role: "host", room: "AAAB" });

    const guest = await join(url, "AAAB");
    await until(() => guest.received.length >= 1 && host.received.length >= 2);
    expect(guest.received[0]).toEqual({ t: "joined", role: "guest", room: "AAAB" });
    expect(host.received[1]).toEqual({ t: "peer-joined" });
    host.transport.close();
    guest.transport.close();
  });

  test("as mensagens do jogo atravessam o servidor nos dois sentidos", async () => {
    const { host, guest } = await pairInRoom(url, "AAAC");

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

  test("as mensagens chegam na ordem em que foram enviadas", async () => {
    const { host, guest } = await pairInRoom(url, "AAAK");
    for (let n = 0; n < 200; n++) host.transport.send({ t: "intent", n });
    await until(() => guest.received.length >= 201);
    expect(guest.received.slice(1).map((m) => m.n)).toEqual(Array.from({ length: 200 }, (_, n) => n));
    host.transport.close();
    guest.transport.close();
  });

  test("quem manda não recebe a própria mensagem de volta", async () => {
    const { host, guest } = await pairInRoom(url, "AAAD");
    const before = guest.received.length;
    guest.transport.send({ t: "intent", n: 1 });
    await wait(200);
    expect(guest.received.length).toBe(before);
    host.transport.close();
    guest.transport.close();
  });

  test("salas diferentes não se misturam", async () => {
    const one = await pairInRoom(url, "AAAM");
    const two = await pairInRoom(url, "AAAN");
    one.host.transport.send({ t: "intent", n: 9 });
    await until(() => one.guest.received.length >= 2);
    await wait(150);
    expect(two.guest.received).toHaveLength(1); // só o "joined"
    for (const peer of [one.host, one.guest, two.host, two.guest]) peer.transport.close();
  });

  test("um terceiro jogador é recusado com room-full e a sala continua dos dois", async () => {
    const { host, guest } = await pairInRoom(url, "AAAE");

    const third = await join(url, "AAAE");
    await until(() => third.closed.value);
    expect(third.received).toEqual([{ t: "error", code: "room-full" }]);

    host.transport.send({ t: "intent", n: 2 });
    await until(() => guest.received.length >= 2);
    expect(guest.received[1]).toEqual({ t: "intent", n: 2 });
    host.transport.close();
    guest.transport.close();
  });

  test("um código de sala inválido é recusado", async () => {
    for (const bad of ["abc", "ABCDE", "AB1D", "ABIO"]) {
      const peer = await join(url, bad);
      await until(() => peer.closed.value);
      expect(peer.received, bad).toEqual([{ t: "error", code: "bad-room" }]);
    }
  });

  test("mensagens inválidas recebem erro e não chegam ao outro jogador", async () => {
    const { host, guest } = await pairInRoom(url, "AAAF");

    host.transport.socket.send("isto não é json");
    host.transport.socket.send(JSON.stringify({ t: "joined", role: "host" }));
    await until(() => host.received.filter((m) => m.t === "error").length >= 2);
    await wait(100);
    expect(guest.received).toHaveLength(1); // só o "joined"
    host.transport.close();
    guest.transport.close();
  });

  test("o ping de manutenção não dá erro e não é repassado", async () => {
    const { host, guest } = await pairInRoom(url, "AAAP");
    host.transport.send({ t: "ping" });
    await wait(300);
    expect(host.received.filter((m) => m.t === "error")).toEqual([]);
    expect(guest.received).toHaveLength(1);
    host.transport.close();
    guest.transport.close();
  });

  test("quando o convidado sai, o anfitrião é avisado e outro convidado pode entrar", async () => {
    const { host, guest } = await pairInRoom(url, "AAAG");

    guest.transport.close();
    await until(() => host.received.some((m) => m.t === "peer-left"));

    const next = await join(url, "AAAG");
    await until(() => next.received.length >= 1);
    expect(next.received[0]).toMatchObject({ t: "joined", role: "guest" });
    host.transport.close();
    next.transport.close();
  });

  test("quando o anfitrião sai, o convidado é avisado e desconectado, e a sala pode ser criada de novo", async () => {
    const { host, guest } = await pairInRoom(url, "AAAH");

    host.transport.close();
    await until(() => guest.closed.value);
    expect(guest.received.some((m) => m.t === "peer-left")).toBe(true);

    const again = await join(url, "AAAH");
    await until(() => again.received.length >= 1);
    expect(again.received[0]).toEqual({ t: "joined", role: "host", room: "AAAH" });
    again.transport.close();
  });

  test("um snapshot grande (milhares de bytes) chega inteiro", async () => {
    const { host, guest } = await pairInRoom(url, "AAAJ");

    const entities = {};
    for (let i = 0; i < 80; i++) entities[`slime-${i}`] = { x: i * 1.5, y: 350, vx: 0, vy: 0, anim: "slime-idle", health: 20 };
    const snapshot = { t: "snapshot", full: true, tick: 1, game: {}, entities };
    host.transport.send(snapshot);
    await until(() => guest.received.length >= 2);
    expect(guest.received[1]).toEqual(snapshot);
    host.transport.close();
    guest.transport.close();
  });

  test("a taxa de uma partida (20 snapshots por segundo por 3 segundos) passa sem perder nada", async () => {
    const { host, guest } = await pairInRoom(url, "AAAQ");
    const entities = {};
    for (let i = 0; i < 30; i++) entities[`slime-${i}`] = { x: i, y: 350 };
    for (let tick = 0; tick < 60; tick++) {
      host.transport.send({ t: "snapshot", full: false, tick, entities });
      guest.transport.send({ t: "intent", n: tick % 32 });
      await wait(50);
    }
    await until(() => guest.received.length >= 61 && host.received.length >= 61, 8000);
    expect(guest.received.slice(1).map((m) => m.tick)).toEqual(Array.from({ length: 60 }, (_, i) => i));
    host.transport.close();
    guest.transport.close();
  });

  test("conectar num endereço sem servidor falha com erro claro, sem travar", async () => {
    await expect(WebSocketTransport.connect("ws://localhost:1/room/ABCD", { timeoutMs: 1500 })).rejects.toThrow(/Could not connect/);
  });
}
