import { test, expect } from "@playwright/test";

// O jogo de verdade (duas páginas) passando pelo Turnstile e pelo Worker na porta 8790, que exige o
// desafio. Usa a chave de site de teste da Cloudflare (invisível, sempre passa), que carrega o script
// real da Cloudflare (precisa de internet).

const scene = "window.__game.scene.getScene('game')";
const RELAY = process.env.WORKER_TURNSTILE_URL ?? "ws://localhost:8790";
const TEST_SITE_KEY = "1x00000000000000000000BB";

async function open(browser, query, { block = false } = {}) {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", (err) => page.errors.push(err.message));
  if (block) await page.route("**/challenges.cloudflare.com/**", (route) => route.abort());
  await page.goto(`/?${query}`);
  await page.waitForFunction(() => window.__game?.scene.isActive("start"), null, { timeout: 30_000 });
  await page.evaluate(() => {
    window.__game.scene.getScene("start").scene.start("game");
  });
  await page.waitForFunction(() => window.__game.scene.isActive("game"), null, { timeout: 30_000 });
  return page;
}

const statusText = (page) => page.evaluate(`${scene}.onlineStatus.text.text`);

test("os dois jogadores passam pelo desafio invisível e jogam juntos", async ({ browser }) => {
  const query = (role, extra = "") => `online=${role}&room=XXTF22&relay=${RELAY}&turnstileKey=${TEST_SITE_KEY}${extra}`;
  const host = await open(browser, query("host"));
  await host.waitForFunction(`${scene}.session !== undefined`, null, { timeout: 30_000 });
  const guest = await open(browser, query("join"));
  await host.waitForFunction(`${scene}.session.peerReady === true`, null, { timeout: 30_000, polling: 100 });
  await guest.waitForFunction(`${scene}.session?.base`, null, { timeout: 30_000, polling: 100 });

  // E o jogo anda de verdade: o que o anfitrião aperta aparece no convidado.
  const yinX = (page) => page.evaluate(`${scene}.players.find((p) => p.character === "yin").sprite.x`);
  const before = await yinX(guest);
  await host.keyboard.down("ArrowRight");
  await guest.waitForFunction(`${scene}.players.find((p) => p.character === "yin").sprite.x > ${before + 60}`, null, {
    timeout: 15_000,
    polling: 100,
  });
  await host.keyboard.up("ArrowRight");

  // O widget não deixa lixo na página.
  expect(await host.locator("#turnstile-box").count()).toBe(0);
  expect([...host.errors, ...guest.errors]).toEqual([]);
  await host.context().close();
  await guest.context().close();
});

test("sem a chave do site, o servidor recusa e o jogo explica", async ({ browser }) => {
  const page = await open(browser, `online=host&room=XXTG22&relay=${RELAY}`);
  await page.waitForFunction(`${scene}.onlineStatus.error === true`, null, { timeout: 30_000 });
  expect(await statusText(page)).toContain("Verificação de segurança necessária");
  expect(await page.evaluate(`${scene}.session === undefined`)).toBe(true);
  await page.context().close();
});

test("com o script do Turnstile bloqueado (um bloqueador de anúncios), o jogo explica em vez de travar", async ({ browser }) => {
  const page = await open(browser, `online=host&room=XXTH22&relay=${RELAY}&turnstileKey=${TEST_SITE_KEY}`, { block: true });
  await page.waitForFunction(`${scene}.onlineStatus.error === true`, null, { timeout: 30_000 });
  expect(await statusText(page)).toContain("verificação de segurança não carregou");
  await page.context().close();
});

test("o jogo local continua funcionando mesmo quando o online falha", async ({ browser }) => {
  const page = await open(browser, `online=host&room=XXTJ22&relay=${RELAY}`);
  await page.waitForFunction(`${scene}.onlineStatus.error === true`, null, { timeout: 30_000 });
  const x0 = await page.evaluate(`${scene}.localPlayer.sprite.x`);
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(`${scene}.localPlayer.sprite.x > ${x0 + 40}`, null, { timeout: 8000 });
  await page.keyboard.up("ArrowRight");
  await page.context().close();
});
