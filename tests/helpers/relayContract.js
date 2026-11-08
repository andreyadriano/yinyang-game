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

// Conecta numa sala e vai juntando o que chega. `url(room, role)` dá o endereço do WebSocket
// (role é "host", "guest" ou nada).
export async function join(url, room, role) {
  const transport = await WebSocketTransport.connect(url(room, role));
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
    const host = await join(url, "XXAAAB");
    await until(() => host.received.length >= 1);
    expect(host.received[0]).toEqual({ t: "joined", role: "host", room: "XXAAAB" });

    const guest = await join(url, "XXAAAB");
    await until(() => guest.received.length >= 1 && host.received.length >= 2);
    expect(guest.received[0]).toEqual({ t: "joined", role: "guest", room: "XXAAAB" });
    expect(host.received[1]).toEqual({ t: "peer-joined" });
    host.transport.close();
    guest.transport.close();
  });

  test("as mensagens do jogo atravessam o servidor nos dois sentidos", async () => {
    const { host, guest } = await pairInRoom(url, "XXAAAC");

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
    const { host, guest } = await pairInRoom(url, "XXAAAK");
    // 120 de uma vez: bastante, mas dentro da rajada permitida (150).
    for (let n = 0; n < 120; n++) host.transport.send({ t: "intent", n });
    await until(() => guest.received.length >= 121);
    expect(guest.received.slice(1).map((m) => m.n)).toEqual(Array.from({ length: 120 }, (_, n) => n));
    host.transport.close();
    guest.transport.close();
  });

  test("quem manda não recebe a própria mensagem de volta", async () => {
    const { host, guest } = await pairInRoom(url, "XXAAAD");
    const before = guest.received.length;
    guest.transport.send({ t: "intent", n: 1 });
    await wait(200);
    expect(guest.received.length).toBe(before);
    host.transport.close();
    guest.transport.close();
  });

  test("salas diferentes não se misturam", async () => {
    const one = await pairInRoom(url, "XXAAAM");
    const two = await pairInRoom(url, "XXAAAN");
    one.host.transport.send({ t: "intent", n: 9 });
    await until(() => one.guest.received.length >= 2);
    await wait(150);
    expect(two.guest.received).toHaveLength(1); // só o "joined"
    for (const peer of [one.host, one.guest, two.host, two.guest]) peer.transport.close();
  });

  test("um terceiro jogador é recusado com room-full e a sala continua dos dois", async () => {
    const { host, guest } = await pairInRoom(url, "XXAAAE");

    const third = await join(url, "XXAAAE");
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
    const { host, guest } = await pairInRoom(url, "XXAAAF");

    host.transport.socket.send("isto não é json");
    host.transport.socket.send(JSON.stringify({ t: "joined", role: "host" }));
    await until(() => host.received.filter((m) => m.t === "error").length >= 2);
    await wait(100);
    expect(guest.received).toHaveLength(1); // só o "joined"
    host.transport.close();
    guest.transport.close();
  });

  test("o ping de manutenção não dá erro e não é repassado", async () => {
    const { host, guest } = await pairInRoom(url, "XXAAAP");
    host.transport.send({ t: "ping" });
    await wait(300);
    expect(host.received.filter((m) => m.t === "error")).toEqual([]);
    expect(guest.received).toHaveLength(1);
    host.transport.close();
    guest.transport.close();
  });

  test("quando o convidado sai, o anfitrião é avisado e outro convidado pode entrar", async () => {
    const { host, guest } = await pairInRoom(url, "XXAAAG");

    guest.transport.close();
    await until(() => host.received.some((m) => m.t === "peer-left"));

    const next = await join(url, "XXAAAG");
    await until(() => next.received.length >= 1);
    expect(next.received[0]).toMatchObject({ t: "joined", role: "guest" });
    host.transport.close();
    next.transport.close();
  });

  test("quando o anfitrião sai, o convidado é avisado e desconectado, e a sala pode ser criada de novo", async () => {
    const { host, guest } = await pairInRoom(url, "XXAAAH");

    host.transport.close();
    await until(() => guest.closed.value);
    expect(guest.received.some((m) => m.t === "peer-left")).toBe(true);

    const again = await join(url, "XXAAAH");
    await until(() => again.received.length >= 1);
    expect(again.received[0]).toEqual({ t: "joined", role: "host", room: "XXAAAH" });
    again.transport.close();
  });

  test("um snapshot grande (milhares de bytes) chega inteiro", async () => {
    const { host, guest } = await pairInRoom(url, "XXAAAJ");

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
    const { host, guest } = await pairInRoom(url, "XXAAAQ");
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

  test("pedir para ser convidado de uma sala que não existe é recusado, e isso não cria a sala", async () => {
    const guest = await join(url, "XXAAGA", "guest");
    await until(() => guest.closed.value);
    expect(guest.received).toEqual([{ t: "error", code: "room-not-found" }]);

    // A sala continua sem existir: quem chegar agora, sem pedir papel, é o anfitrião.
    const first = await join(url, "XXAAGA");
    await until(() => first.received.length >= 1);
    expect(first.received[0]).toEqual({ t: "joined", role: "host", room: "XXAAGA" });
    first.transport.close();
  });

  test("pedir para ser anfitrião de uma sala que já tem anfitrião é recusado e a sala original não muda", async () => {
    const { host, guest } = await pairInRoom(url, "XXAAGB");
    const intruder = await join(url, "XXAAGB", "host");
    await until(() => intruder.closed.value);
    expect(intruder.received).toEqual([{ t: "error", code: "room-in-use" }]);

    host.transport.send({ t: "intent", n: 3 });
    await until(() => guest.received.length >= 2);
    expect(guest.received[1]).toEqual({ t: "intent", n: 3 });
    host.transport.close();
    guest.transport.close();
  });

  test("os papéis pedidos funcionam: anfitrião pede host, convidado pede guest", async () => {
    const host = await join(url, "XXAAGC", "host");
    await until(() => host.received.length >= 1);
    expect(host.received[0]).toMatchObject({ t: "joined", role: "host" });
    const guest = await join(url, "XXAAGC", "guest");
    await until(() => guest.received.length >= 1 && host.received.length >= 2);
    expect(guest.received[0]).toMatchObject({ t: "joined", role: "guest" });
    host.transport.close();
    guest.transport.close();
  });

  test("uma enxurrada de mensagens é cortada: o infrator é desconectado e o outro jogador é avisado", async () => {
    const { host, guest } = await pairInRoom(url, "XXAAGD");
    for (let i = 0; i < 800; i++) host.transport.socket.send(JSON.stringify({ t: "intent", n: i % 32 }));

    await until(() => host.closed.value, 8000);
    expect(host.received.some((m) => m.t === "error" && m.code === "rate-limit")).toBe(true);
    await until(() => guest.received.some((m) => m.t === "peer-left"));
    // Não passou tudo: o que veio depois da rajada permitida foi descartado.
    expect(guest.received.filter((m) => m.t === "intent").length).toBeLessThan(400);
    guest.transport.close();
  });

  test("lixo repetido desconecta o infrator", async () => {
    const { host, guest } = await pairInRoom(url, "XXAAGE");
    for (let i = 0; i < 8; i++) host.transport.socket.send("isto não é json");
    await until(() => host.closed.value, 8000);
    expect(host.received.some((m) => m.t === "error" && m.code === "bad-message")).toBe(true);
    expect(guest.received.filter((m) => m.t !== "joined" && m.t !== "peer-left")).toEqual([]);
    guest.transport.close();
  });

  test("uma mensagem enorme é recusada e não chega ao outro jogador", async () => {
    const { host, guest } = await pairInRoom(url, "XXAAGF");
    host.transport.socket.send(JSON.stringify({ t: "snapshot", full: true, tick: 1, entities: {}, pad: "x".repeat(40_000) }));
    await until(() => host.received.some((m) => m.t === "error" && m.code === "bad-message"));
    await wait(150);
    expect(guest.received).toHaveLength(1); // só o "joined"
    host.transport.close();
    guest.transport.close();
  });

  test("conectar num endereço sem servidor falha com erro claro, sem travar", async () => {
    await expect(WebSocketTransport.connect("ws://localhost:1/room/XXABCD", { timeoutMs: 1500 })).rejects.toThrow(/Could not connect/);
  });
}
