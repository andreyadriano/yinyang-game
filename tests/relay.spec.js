import { test, expect } from "@playwright/test";
import { startRelay } from "../server/relay.js";
import { defineRelayContract, pairInRoom, until } from "./helpers/relayContract.js";

// O servidor de repasse em Node (server/relay.js) com clientes de verdade.

let relay;
test.beforeAll(async () => {
  relay = await startRelay({ port: 0 });
});
test.afterAll(async () => {
  await relay.close();
});

const url = (room) => `ws://localhost:${relay.port}/room/${room}`;

defineRelayContract(url);

test("o endereço /health responde ok", async () => {
  const response = await fetch(`http://localhost:${relay.port}/health`);
  expect(await response.text()).toBe("ok");
});

test("a sala some do registro quando todos saem", async () => {
  const { host, guest } = await pairInRoom(url, "AAAR");
  expect(relay.registry.rooms.has("AAAR")).toBe(true);
  host.transport.close();
  await until(() => guest.closed.value);
  await until(() => !relay.registry.rooms.has("AAAR"));
});
