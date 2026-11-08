import { test, expect } from "@playwright/test";
import { defineRelayContract, join, pairInRoom, until, wait } from "./helpers/relayContract.js";

// O Worker da Cloudflare (worker/), rodando localmente com `wrangler dev` (workerd de verdade, com
// Durable Objects e hibernação). Passa pelo mesmo contrato do servidor Node: os dois precisam
// se comportar igual. Rode com: npm run test:worker

const base = process.env.WORKER_URL ?? "ws://localhost:8788";
const url = (room, role) => `${base}/room/${room}${role ? `?role=${role}` : ""}`;

defineRelayContract(url);

test("o endereço /health responde ok", async () => {
  const response = await fetch(`${base.replace("ws", "http")}/health`);
  expect(await response.text()).toBe("ok");
});

test("endereços que não são de sala dão 404, e sem WebSocket dão 426", async () => {
  const http = base.replace("ws", "http");
  expect((await fetch(`${http}/qualquer-coisa`)).status).toBe(404);
  expect((await fetch(`${http}/room/XXABCD`)).status).toBe(426);
});

test("o ping de manutenção é respondido com pong pelo próprio runtime", async () => {
  const { host, guest } = await pairInRoom(url, "XXAAAS");
  host.transport.socket.send('{"t":"ping"}');
  // O transporte esconde o pong; lemos direto do socket.
  const pong = await new Promise((resolve) => {
    host.transport.socket.addEventListener("message", (event) => {
      if (event.data.includes('"pong"')) resolve(event.data);
    });
  });
  expect(pong).toBe('{"t":"pong"}');
  host.transport.close();
  guest.transport.close();
});

test("a sala continua certa depois que o objeto hiberna (anfitrião esperando sozinho)", async () => {
  test.setTimeout(90_000);
  const host = await join(url, "XXAAAT");
  await until(() => host.received.length >= 1);

  // Sem nenhuma mensagem, o Durable Object sai da memória; o socket do anfitrião continua aberto.
  await wait(25_000);

  const guest = await join(url, "XXAAAT");
  await until(() => guest.received.length >= 1 && host.received.length >= 2);
  expect(guest.received[0]).toMatchObject({ t: "joined", role: "guest" }); // a sala lembrou do anfitrião
  expect(host.received[1]).toEqual({ t: "peer-joined" });

  // E o repasse funciona nos dois sentidos depois de acordar.
  host.transport.send({ t: "snapshot", full: true, tick: 1, game: {}, entities: {} });
  guest.transport.send({ t: "intent", n: 5 });
  await until(() => guest.received.length >= 2 && host.received.length >= 3);
  expect(host.received[2]).toEqual({ t: "intent", n: 5 });
  host.transport.close();
  guest.transport.close();
});
