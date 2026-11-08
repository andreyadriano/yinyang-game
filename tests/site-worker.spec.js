import { test, expect } from "@playwright/test";
import WebSocket from "ws";

// O Worker como em produção (porta 8792): ele serve o site e as salas no mesmo endereço, e só aceita
// conexões vindas da própria página (ALLOWED_ORIGINS = "self").

const http = process.env.WORKER_SITE_URL ?? "http://localhost:8792";
const ws = http.replace("http", "ws");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test.describe("o site", () => {
  test("a página inicial é servida pelo Worker", async () => {
    const response = await fetch(`${http}/`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/text\/html/);
    const html = await response.text();
    expect(html).toContain("<title>Yin Yang</title>");
    expect(html).toContain('src="src/main.js"');
  });

  test("o código, o estilo e os arquivos do jogo são servidos com o tipo certo", async () => {
    const cases = [
      ["/main.css", /text\/css/],
      ["/src/main.js", /javascript/],
      ["/src/net/RoomCore.js", /javascript/],
      ["/assets/environment/level1.json", /json/],
      ["/assets/interface/start.png", /image\/png/],
      ["/assets/sounds/sfx/movement/jump1.mp3", /audio|mpeg|octet/],
    ];
    for (const [path, type] of cases) {
      const response = await fetch(`${http}${path}`);
      expect(response.status, path).toBe(200);
      expect(response.headers.get("content-type"), path).toMatch(type);
      await response.arrayBuffer();
    }
  });

  test("o arquivo do jogo servido é o mesmo do disco", async () => {
    const { readFileSync } = await import("node:fs");
    const served = await (await fetch(`${http}/src/net/protocol.js`)).text();
    expect(served).toBe(readFileSync("src/net/protocol.js", "utf8"));
  });

  test("o que não é arquivo nem sala dá 404; o /health responde; a sala sem WebSocket dá 426", async () => {
    expect((await fetch(`${http}/nada-aqui`)).status).toBe(404);
    expect((await fetch(`${http}/assets/nao-existe.png`)).status).toBe(404);
    expect(await (await fetch(`${http}/health`)).text()).toBe("ok");
    expect((await fetch(`${http}/room/XXKM23`)).status).toBe(426);
  });

  test("arquivos do servidor não estão no site", async () => {
    for (const path of ["/worker/src/Room.js", "/server/relay.js", "/package.json", "/tests/online.spec.js", "/.git/config", "/worker/DEPLOY.md"]) {
      expect((await fetch(`${http}${path}`)).status, path).toBe(404);
    }
  });
});

test.describe("origem das conexões (ALLOWED_ORIGINS = self)", () => {
  function connect(room, origin) {
    const socket = new WebSocket(`${ws}/room/${room}?role=host`, origin ? { headers: { Origin: origin } } : {});
    const log = { messages: [], status: null, closed: false };
    socket.on("message", (data) => log.messages.push(JSON.parse(data.toString())));
    socket.on("unexpected-response", (request, response) => (log.status = response.statusCode));
    socket.on("close", () => (log.closed = true));
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

  test("a própria página pode abrir uma sala", async () => {
    const { socket, log } = connect("XXSA23", http);
    await until(() => log.messages.some((m) => m.t === "joined"));
    socket.close();
  });

  test("uma página de outro endereço é recusada com 403", async () => {
    const { log } = connect("XXSB23", "https://intruso.example.com");
    await until(() => log.status !== null);
    expect(log.status).toBe(403);
  });

  test("um parecido com o nosso, mas que não é, também é recusado", async () => {
    // (Outro esquema, https no lugar de http, é coberto em tests/security.spec.js: o proxy do wrangler dev
    // reescreve esse caso, então ele não pode ser testado aqui.)
    for (const [i, origin] of [`${http}.intruso.com`, "http://localhost:9999"].entries()) {
      const { log } = connect(`XXSC2${i + 3}`, origin);
      await until(() => log.status !== null);
      expect(log.status, origin).toBe(403);
    }
  });

  test("sem cabeçalho de origem (um script) é recusado", async () => {
    const { log } = connect("XXSD23");
    await until(() => log.status !== null);
    expect(log.status).toBe(403);
  });
});
