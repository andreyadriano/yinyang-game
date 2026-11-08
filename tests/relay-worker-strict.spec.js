import { test, expect } from "@playwright/test";
import WebSocket from "ws";

// O Worker numa segunda instância "rígida" (porta 8789): limite de 3 conexões por endereço, sala
// esperando só 3 s e vida máxima de 7 s, para testar o que depende de limite baixo e de tempo.
// Cada conexão se identifica com o cabeçalho x-client-id (é como o teste finge ser pessoas diferentes).

const base = process.env.WORKER_STRICT_URL ?? "ws://localhost:8789";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let counter = 0;
const newId = () => `cliente-${Date.now()}-${counter++}`;

// Abre uma conexão e junta o que acontece com ela.
function connect(room, { id = newId(), role } = {}) {
  const query = role ? `?role=${role}` : "";
  const socket = new WebSocket(`${base}/room/${room}${query}`, { headers: { "x-client-id": id } });
  const log = { messages: [], closed: false, status: null, opened: false };
  socket.on("open", () => (log.opened = true));
  socket.on("message", (data) => log.messages.push(JSON.parse(data.toString())));
  socket.on("close", () => (log.closed = true));
  socket.on("unexpected-response", (request, response) => (log.status = response.statusCode));
  socket.on("error", () => {});
  return { socket, log };
}

const until = async (condition, ms = 8000) => {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > ms) throw new Error("tempo esgotado");
    await wait(25);
  }
};

test("muitas tentativas do mesmo endereço levam a 429; outro endereço não é afetado", async () => {
  const same = newId();
  const attempts = [];
  for (let i = 0; i < 7; i++) attempts.push(connect(`XXBB${"CDEFGHJ"[i]}${"2"}`, { id: same }));
  await until(() => attempts.every(({ log }) => log.opened || log.status !== null));

  const accepted = attempts.filter(({ log }) => log.opened).length;
  const refused = attempts.filter(({ log }) => log.status === 429).length;
  expect(accepted).toBe(3);
  expect(refused).toBe(4);

  const other = connect("XXBBKM", { id: newId() });
  await until(() => other.log.opened);
  for (const { socket } of [...attempts, other]) socket.close();
});

test("um anfitrião esquecido esperando sozinho é avisado com room-timeout", async () => {
  const host = connect("XXBC22", { role: "host" });
  await until(() => host.log.messages.some((m) => m.t === "joined"));

  await until(() => host.log.messages.some((m) => m.t === "error" && m.code === "room-timeout"), 10_000);
  // (O jogo se desconecta sozinho ao receber o erro; ver HostSession. No wrangler dev, o fechamento
  // iniciado pelo servidor nesse caso não chega ao cliente, então não esperamos por ele aqui.
  // O que importa é que a vaga é liberada: o teste seguinte mostra que o código pode ser reusado.)
  host.socket.close();
});

test("com um amigo na sala, esperar não expira, mas a sala tem uma vida máxima", async () => {
  const host = connect("XXBD22", { role: "host" });
  await until(() => host.log.messages.some((m) => m.t === "joined"));
  const guest = connect("XXBD22", { role: "guest" });
  await until(() => guest.log.messages.some((m) => m.t === "joined"));

  // Passa o tempo de espera de quem está sozinho (3 s): com amigo, a sala segue de pé.
  await wait(4500);
  expect(host.log.closed).toBe(false);
  expect(guest.log.closed).toBe(false);

  // Mas ela não vive para sempre (7 s no teste).
  await until(() => host.log.messages.some((m) => m.t === "error" && m.code === "room-timeout"), 10_000);
  await until(() => guest.log.messages.some((m) => m.t === "error" && m.code === "room-timeout"), 10_000);
});

test("uma sala nova pode usar o mesmo código depois que a antiga expirou", async () => {
  const first = connect("XXBE22", { role: "host" });
  await until(() => first.log.messages.some((m) => m.t === "error" && m.code === "room-timeout"), 12_000);
  // A vaga é liberada pelo servidor na hora, antes mesmo de a conexão antiga terminar de fechar.

  const again = connect("XXBE22", { role: "host" });
  await until(() => again.log.messages.some((m) => m.t === "joined"));
  again.socket.close();
});

test("um convidado não cria sala nem na instância rígida", async () => {
  const guest = connect("XXBF22", { role: "guest" });
  await until(() => guest.log.closed);
  expect(guest.log.messages).toEqual([{ t: "error", code: "room-not-found" }]);
});
