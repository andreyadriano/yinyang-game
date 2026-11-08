import { test, expect } from "@playwright/test";

// Teste de fumaça: o jogo carrega, a cena inicial aparece, a fase roda por
// alguns segundos e nada joga erro no console.
test("o jogo carrega e a fase roda sem erros no console", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
  });

  await page.goto("/");

  await page.waitForFunction(() => window.__game?.scene.isActive("start"), null, { timeout: 20_000 });

  // Pula a tela inicial (que espera um clique) e entra direto na fase.
  await page.evaluate(() => window.__game.scene.getScene("start").scene.start("game"));
  await page.waitForFunction(() => window.__game.scene.isActive("game"), null, { timeout: 30_000 });

  // Deixa a fase rodar um pouco, com os dois jogadores parados e os inimigos ativos.
  await page.waitForTimeout(3_000);

  expect(await page.evaluate(() => window.__game.scene.isActive("game"))).toBe(true);
  expect(errors).toEqual([]);
});
