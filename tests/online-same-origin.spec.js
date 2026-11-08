import { test, expect } from "@playwright/test";

// O jogo de verdade, como em produção: a página vem do Worker (porta 8792) e o servidor das salas é o
// mesmo endereço, sem ?relay= para um outro lugar (só ?relay=same, porque em localhost o padrão é o
// servidor local). O Worker só aceita conexões da própria página.

const scene = "window.__game.scene.getScene('game')";
const site = process.env.WORKER_SITE_URL ?? "http://localhost:8792";

async function open(browser, query) {
  const context = await browser.newContext({ baseURL: site });
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", (err) => page.errors.push(err.message));
  await page.goto(`/?${query}`);
  await page.waitForFunction(() => window.__game?.scene.isActive("start"), null, { timeout: 30_000 });
  await page.evaluate(() => {
    window.__game.scene.getScene("start").scene.start("game");
  });
  await page.waitForFunction(() => window.__game.scene.isActive("game"), null, { timeout: 30_000 });
  return page;
}

test("o jogo servido pelo Worker se conecta às salas do mesmo endereço e dois jogadores jogam juntos", async ({ browser }) => {
  const host = await open(browser, "online=host&room=XXSE23&relay=same");
  await host.waitForFunction(`${scene}.session !== undefined`, null, { timeout: 30_000 });
  expect(await host.evaluate(`${scene}.mode.online.relayUrl`)).toBe(site.replace("http", "ws"));

  const guest = await open(browser, "online=join&room=XXSE23&relay=same");
  await host.waitForFunction(`${scene}.session.peerReady === true`, null, { timeout: 30_000, polling: 100 });
  await guest.waitForFunction(`${scene}.session?.base`, null, { timeout: 30_000, polling: 100 });

  const yinX = (page) => page.evaluate(`${scene}.players.find((p) => p.character === "yin").sprite.x`);
  const before = await yinX(guest);
  await host.keyboard.down("ArrowRight");
  await guest.waitForFunction(`${scene}.players.find((p) => p.character === "yin").sprite.x > ${before + 60}`, null, {
    timeout: 15_000,
    polling: 100,
  });
  await host.keyboard.up("ArrowRight");

  expect([...host.errors, ...guest.errors]).toEqual([]);
  await host.context().close();
  await guest.context().close();
});

test("todos os arquivos do jogo vêm do Worker, e nenhum pedido falha ao carregar", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: site });
  const page = await context.newPage();
  const failed = [];
  const hosts = new Set();
  page.on("response", (response) => {
    const host = new URL(response.url()).host;
    if (host) hosts.add(host); // (o ícone da página é um data: e não tem endereço)
    if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
  });
  await page.goto("/");
  await page.waitForFunction(() => window.__game?.scene.isActive("start"), null, { timeout: 30_000 });

  expect(failed).toEqual([]);
  // O próprio endereço do jogo e a CDN do Phaser (que continua vindo de fora).
  expect([...hosts].sort()).toEqual(["cdn.jsdelivr.net", new URL(site).host].sort());
  await context.close();
});
