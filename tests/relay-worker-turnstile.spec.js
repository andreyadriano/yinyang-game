import { test, expect } from "@playwright/test";
import WebSocket from "ws";

// O Worker com o Turnstile ligado, usando as chaves secretas de TESTE oficiais da Cloudflare:
//   8790  1x0000000000000000000000000000000AA  sempre aprova (qualquer token)
//   8791  2x0000000000000000000000000000000AA  sempre recusa (a Cloudflare responde invalid-input-response)
// A verificação chama a Cloudflare de verdade (precisa de internet).

const base = process.env.WORKER_TURNSTILE_URL ?? "ws://localhost:8790";
const baseFail = process.env.WORKER_TURNSTILE_FAIL_URL ?? "ws://localhost:8791";
const DUMMY_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function connect(room, { ts, role = "host", server = base } = {}) {
  const params = new URLSearchParams({ role });
  if (ts) params.set("ts", ts);
  const socket = new WebSocket(`${server}/room/${room}?${params}`);
  const log = { messages: [], closed: false };
  socket.on("message", (data) => log.messages.push(JSON.parse(data.toString())));
  socket.on("close", () => (log.closed = true));
  socket.on("error", () => {});
  return { socket, log };
}

const until = async (condition, ms = 10_000) => {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > ms) throw new Error("tempo esgotado");
    await wait(25);
  }
};

test("sem token a conexão é recusada com challenge-required", async () => {
  const { log } = connect("XXTA22");
  await until(() => log.closed);
  expect(log.messages).toEqual([{ t: "error", code: "challenge-required" }]);
});

test("com o token de teste a conexão é aceita", async () => {
  const { socket, log } = connect("XXTB22", { ts: DUMMY_TOKEN });
  await until(() => log.messages.some((m) => m.t === "joined"));
  expect(log.messages[0]).toEqual({ t: "joined", role: "host", room: "XXTB22" });
  socket.close();
});

test("quando a Cloudflare recusa o token, a conexão é recusada com challenge-failed", async () => {
  const { log } = connect("XXTC22", { ts: DUMMY_TOKEN, server: baseFail });
  await until(() => log.closed);
  expect(log.messages).toEqual([{ t: "error", code: "challenge-failed" }]);
});

test("recusada pela Cloudflare, a sala também não é criada", async () => {
  const refused = connect("XXTK22", { ts: DUMMY_TOKEN, server: baseFail });
  await until(() => refused.log.closed);
  const { log } = connect("XXTK22", { ts: DUMMY_TOKEN, role: "guest", server: baseFail });
  await until(() => log.closed);
  expect(log.messages).toEqual([{ t: "error", code: "challenge-failed" }]); // nem chega a dizer que a sala não existe
});

test("os dois jogadores passam pelo desafio e o repasse funciona", async () => {
  const host = connect("XXTD22", { ts: DUMMY_TOKEN });
  await until(() => host.log.messages.some((m) => m.t === "joined"));
  const guest = connect("XXTD22", { ts: DUMMY_TOKEN, role: "guest" });
  await until(() => guest.log.messages.some((m) => m.t === "joined"));

  host.socket.send(JSON.stringify({ t: "sound", name: "jump" }));
  await until(() => guest.log.messages.some((m) => m.t === "sound"));
  host.socket.close();
  guest.socket.close();
});

test("a sala não é criada por quem foi recusado: o código continua livre", async () => {
  const refused = connect("XXTE22"); // sem token
  await until(() => refused.log.closed);

  const { socket, log } = connect("XXTE22", { ts: DUMMY_TOKEN, role: "guest" });
  await until(() => log.closed);
  expect(log.messages).toEqual([{ t: "error", code: "room-not-found" }]); // nenhuma sala foi criada
  socket.close();
});

test("o /health continua respondendo sem token", async () => {
  const response = await fetch(`${base.replace("ws", "http")}/health`);
  expect(await response.text()).toBe("ok");
});
