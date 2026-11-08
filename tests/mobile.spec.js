import { test, expect, devices } from "@playwright/test";

const scene = "window.__game.scene.getScene('game')";

// Pixel 7 na horizontal: tela de toque, ponteiro "coarse", sem teclado.
const phone = { ...devices["Pixel 7 landscape"] };
delete phone.defaultBrowserType;

// Simula dedos na tela com eventos de toque reais (vários dedos ao mesmo tempo).
class Fingers {
  constructor(page, cdp) {
    this.page = page;
    this.cdp = cdp;
    this.active = new Map();
  }

  // Coordenadas do jogo (800x600) -> coordenadas da página.
  async toPage(gx, gy) {
    const rect = await this.page.evaluate(() => {
      const r = document.querySelector("canvas").getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    });
    return { x: rect.left + (gx * rect.width) / 800, y: rect.top + (gy * rect.height) / 600 };
  }

  async send(type) {
    const touchPoints = [...this.active.entries()].map(([id, p]) => ({ id, x: p.x, y: p.y }));
    await this.cdp.send("Input.dispatchTouchEvent", { type, touchPoints });
  }

  async down(id, gx, gy) {
    this.active.set(id, await this.toPage(gx, gy));
    await this.send("touchStart");
  }

  async up(id) {
    this.active.delete(id);
    await this.send("touchEnd");
  }

  async button(name) {
    const { x, y } = await this.page.evaluate(
      (n) => window.__game.scene.getScene("touchControls").buttons[n],
      name
    );
    return { x, y };
  }

  async press(id, name) {
    const { x, y } = await this.button(name);
    await this.down(id, x, y);
  }
}

async function startGame(page) {
  await page.goto("/");
  await page.waitForFunction(() => window.__game?.scene.isActive("start"), null, { timeout: 30_000 });
  await page.evaluate(() => {
    window.__game.scene.getScene("start").scene.start("game");
  });
  await page.waitForFunction(() => window.__game.scene.isActive("game"), null, { timeout: 30_000 });
  await page.waitForTimeout(500);
}

test.describe("no celular", () => {
  test.use(phone);

  let fingers;
  test.beforeEach(async ({ page }) => {
    page.errors = [];
    page.on("pageerror", (err) => page.errors.push(err.message));
    fingers = new Fingers(page, await page.context().newCDPSession(page));
    await startGame(page);
  });

  test.afterEach(async ({ page }) => {
    expect(page.errors).toEqual([]);
  });

  test("o aparelho de toque joga em modo solo: um jogador e uma câmera", async ({ page }) => {
    const info = await page.evaluate(`({
      mode: ${scene}.mode.name,
      touch: ${scene}.mode.touch,
      players: ${scene}.players.map((p) => p.character),
      cameras: ${scene}.cameras.cameras.length,
      width: ${scene}.cameras.main.width,
      height: ${scene}.cameras.main.height,
    })`);
    expect(info).toEqual({ mode: "solo", touch: true, players: ["yin"], cameras: 1, width: 800, height: 600 });
  });

  test("os controles de toque aparecem e somem junto com a fase", async ({ page }) => {
    expect(await page.evaluate(() => window.__game.scene.isActive("touchControls"))).toBe(true);
    const names = await page.evaluate(() => Object.keys(window.__game.scene.getScene("touchControls").buttons));
    expect(names).toEqual(expect.arrayContaining(["left", "right", "down", "jump", "attack", "pause"]));

    await page.evaluate(`${scene}.state.soulCount = 0`);
    await page.waitForFunction(() => window.__game.scene.isActive("gameOver"), null, { timeout: 15_000 });
    expect(await page.evaluate(() => window.__game.scene.isActive("touchControls"))).toBe(false);
  });

  test("segurar o botão direito move o jogador e soltar o para", async ({ page }) => {
    const x = () => page.evaluate(`${scene}.players[0].sprite.x`);
    const before = await x();

    await fingers.press(1, "right");
    await page.waitForFunction(`${scene}.players[0].sprite.x > ${before + 80}`, null, { timeout: 8000 });

    await fingers.up(1);
    await page.waitForFunction(`Math.abs(${scene}.players[0].sprite.body.velocity.x) < 1`, null, { timeout: 5000 });
    const stopped = await x();
    await page.waitForTimeout(400);
    expect(Math.abs((await x()) - stopped)).toBeLessThan(3);
  });

  test("dois dedos ao mesmo tempo: correr para a direita e pular", async ({ page }) => {
    await fingers.press(1, "right");
    await fingers.press(2, "jump");
    await page.waitForFunction(`${scene}.players[0].sprite.body.velocity.y < -200`, null, {
      timeout: 3000,
      polling: "raf",
    });
    const state = await page.evaluate(`({ x: ${scene}.players[0].sprite.body.velocity.x })`);
    expect(state.x).toBeGreaterThan(100); // continua correndo enquanto pula
    await fingers.up(2);
    await fingers.up(1);
  });

  test("o botão de ataque faz o jogador atacar", async ({ page }) => {
    await fingers.press(1, "attack");
    await page.waitForFunction(`${scene}.players[0].state === "attack"`, null, { timeout: 3000 });
    await fingers.up(1);
  });

  test("o botão de pausa congela a fase e o toque seguinte retoma", async ({ page }) => {
    const tap = async (name) => {
      await fingers.press(1, name);
      await fingers.up(1);
    };
    await tap("pause");
    await page.waitForFunction(() => window.__game.scene.isPaused("game"), null, { timeout: 3000 });
    const frozen = await page.evaluate(`${scene}.players[0].sprite.y`);
    await page.waitForTimeout(500);
    expect(await page.evaluate(`${scene}.players[0].sprite.y`)).toBe(frozen);

    await tap("pause");
    await page.waitForFunction(() => window.__game.scene.isActive("game"), null, { timeout: 3000 });
  });

  test("os inimigos funcionam com um jogador só", async ({ page }) => {
    const slimeX = await page.evaluate(`${scene}.slimes[0].sprite.x`);
    await page.evaluate(
      (x) => {
        const sprite = window.__game.scene.getScene("game").players[0].sprite;
        sprite.setPosition(x + 25, 350);
        sprite.setVelocity(0, 0);
      },
      slimeX
    );
    await page.waitForFunction(`${scene}.state.soulCount < 190`, null, { timeout: 8000 });
  });
});

test.describe("telas de início e de fim no celular", () => {
  test.use(phone);

  test("um único toque na tela inicial começa o jogo", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.__game?.scene.isActive("start"), null, { timeout: 30_000 });
    await page.waitForTimeout(500);
    await page.touchscreen.tap(400, 200);
    await page.waitForFunction(() => window.__game.scene.isActive("game"), null, { timeout: 30_000 });
  });

  test("depois do game over, um toque volta à tela inicial", async ({ page }) => {
    await startGame(page);
    await page.evaluate(`${scene}.state.soulCount = 0`);
    await page.waitForFunction(() => window.__game.scene.isActive("gameOver"), null, { timeout: 15_000 });
    await page.waitForTimeout(1800);
    await page.touchscreen.tap(400, 200);
    await page.waitForFunction(() => window.__game.scene.isActive("start"), null, { timeout: 10_000 });
  });

  test("com o aparelho em pé, o jogo pede para girar a tela", async ({ page }) => {
    await page.goto("/");
    const overlay = page.locator("#rotate-device");
    await expect(overlay).toBeHidden();
    await page.setViewportSize({ width: 412, height: 915 });
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText("Gire o aparelho");
    await page.setViewportSize({ width: 915, height: 412 });
    await expect(overlay).toBeHidden();
  });
});

test.describe("modo solo no desktop", () => {
  test("?mode=solo usa um jogador, uma câmera e o teclado, sem botões de toque", async ({ page }) => {
    await page.goto("/?mode=solo&character=yang");
    await page.waitForFunction(() => window.__game?.scene.isActive("start"), null, { timeout: 30_000 });
    await page.evaluate(() => {
      window.__game.scene.getScene("start").scene.start("game");
    });
    await page.waitForFunction(() => window.__game.scene.isActive("game"), null, { timeout: 30_000 });
    await page.waitForTimeout(500);

    const info = await page.evaluate(`({
      players: ${scene}.players.map((p) => p.character),
      cameras: ${scene}.cameras.cameras.length,
      touchScene: window.__game.scene.isActive("touchControls"),
    })`);
    expect(info).toEqual({ players: ["yang"], cameras: 1, touchScene: false });

    const before = await page.evaluate(`${scene}.players[0].sprite.x`);
    await page.keyboard.down("ArrowRight");
    await page.waitForFunction(`${scene}.players[0].sprite.x > ${before + 50}`, null, { timeout: 8000 });
    await page.keyboard.up("ArrowRight");
  });

  test("sem parâmetros, o desktop continua com dois jogadores e tela dividida", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.__game?.scene.isActive("start"), null, { timeout: 30_000 });
    await page.evaluate(() => {
      window.__game.scene.getScene("start").scene.start("game");
    });
    await page.waitForFunction(() => window.__game.scene.isActive("game"), null, { timeout: 30_000 });
    const info = await page.evaluate(`({
      mode: ${scene}.mode.name,
      players: ${scene}.players.length,
      cameras: ${scene}.cameras.cameras.length,
    })`);
    expect(info).toEqual({ mode: "local", players: 2, cameras: 2 });
  });
});
