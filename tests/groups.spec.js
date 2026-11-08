import { test, expect } from "@playwright/test";

const scene = "window.__game.scene.getScene('game')";

test.beforeEach(async ({ page }) => {
  page.errors = [];
  page.on("pageerror", (err) => page.errors.push(err.message));
  await page.goto("/");
  await page.waitForFunction(() => window.__game?.scene.isActive("start"), null, { timeout: 30_000 });
  await page.evaluate(() => {
    window.__game.scene.getScene("start").scene.start("game");
  });
  await page.waitForFunction(() => window.__game.scene.isActive("game"), null, { timeout: 30_000 });
  await page.waitForTimeout(500);
});

test.afterEach(async ({ page }) => {
  expect(page.errors).toEqual([]);
});

// ---------- o grupo de física não pode desfazer a configuração dos sprites ----------

test("os slimes e esqueletos patrulham sozinhos, sem nenhum jogador por perto", async ({ page }) => {
  // (Os demônios não patrulham: só mantêm a velocidade inicial até baterem numa parede, então não entram aqui.)
  const sample = () =>
    page.evaluate(`[
      ...${scene}.slimes.slice(0, 4),
      ...${scene}.skeletons.slice(0, 4),
    ].map((enemy) => enemy.sprite.x)`);
  const before = await sample();
  await page.waitForTimeout(2000);
  const after = await sample();
  const moved = after.filter((x, i) => Math.abs(x - before[i]) > 5).length;
  expect(moved).toBe(before.length);
});

test("lança-chamas, jumpers e portais continuam imóveis e os inimigos não saem do mundo", async ({ page }) => {
  const result = await page.evaluate(`({
    flamethrowers: ${scene}.flamethrowers.every((f) => f.sprite.body.immovable),
    jumpers: ${scene}.jumpers.every((j) => j.sprite.body.immovable),
    portals: ${scene}.portals.every((p) => p.sprite.body.immovable),
    enemiesStayInWorld: [...${scene}.slimes, ...${scene}.skeletons, ...${scene}.demons].every(
      (e) => e.sprite.body.collideWorldBounds
    ),
  })`);
  expect(result).toEqual({ flamethrowers: true, jumpers: true, portals: true, enemiesStayInWorld: true });
});

test("correr contra um jumper de lado não o empurra", async ({ page }) => {
  const { x, y } = await page.evaluate(`({ x: ${scene}.jumpers[0].sprite.x, y: ${scene}.jumpers[0].sprite.y })`);
  // O jogador começa ao lado do jumper, na altura dele, e corre contra ele.
  await page.evaluate(
    ([jx, jy]) => {
      const sprite = window.__game.scene.getScene("game").players[0].sprite;
      sprite.setPosition(jx - 60, jy - 4);
      sprite.setVelocity(0, 0);
    },
    [x, y]
  );
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(1500);
  await page.keyboard.up("ArrowRight");
  expect(Math.abs((await page.evaluate(`${scene}.jumpers[0].sprite.x`)) - x)).toBeLessThan(2);
});
