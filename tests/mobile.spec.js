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

  // Coordenadas do jogo (a largura segue a tela; a altura é 600) -> coordenadas da página.
  async toPage(gx, gy) {
    const rect = await this.page.evaluate(() => {
      const r = document.querySelector("canvas").getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height, gameWidth: window.__game.scale.width };
    });
    return { x: rect.left + (gx * rect.width) / rect.gameWidth, y: rect.top + (gy * rect.height) / 600 };
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
    expect(info).toMatchObject({ mode: "solo", touch: true, players: ["yin"], cameras: 1, height: 600 });
    // O jogo acompanha a proporção do celular (915x412 ~ 2,2:1), em vez de ficar em 4:3 (800 de largura).
    expect(info.width).toBeGreaterThan(1200);
    expect(info.width).toBeLessThanOrEqual(1400);
  });

  test("o jogo ocupa quase toda a janela do celular (antes eram só ~55% da largura)", async ({ page }) => {
    const { canvas, viewport } = await page.evaluate(() => {
      const r = document.querySelector("canvas").getBoundingClientRect();
      return { canvas: { width: r.width, height: r.height }, viewport: { width: innerWidth, height: innerHeight } };
    });
    // O tamanho segue a proporção da tela inteira, a que vale em tela cheia; com as barras do navegador à
    // mostra a janela é um pouco mais larga, então sobra uma faixa fina dos lados.
    expect(canvas.width / viewport.width).toBeGreaterThan(0.9);
    expect(canvas.height / viewport.height).toBeGreaterThan(0.95);
  });

  test("os botões não se sobrepõem e ficam onde os polegares alcançam", async ({ page }) => {
    const { buttons, width } = await page.evaluate(() => ({
      buttons: window.__game.scene.getScene("touchControls").buttons,
      width: window.__game.scale.width,
    }));
    const names = Object.keys(buttons);
    for (const a of names) {
      for (const b of names) {
        if (a >= b) continue;
        const distance = Math.hypot(buttons[a].x - buttons[b].x, buttons[a].y - buttons[b].y);
        expect(distance, `${a} x ${b}`).toBeGreaterThan(buttons[a].radius + buttons[b].radius);
      }
    }
    // Esquerda e direita no canto esquerdo; ataque, pulo e agachar no canto direito.
    for (const name of ["left", "right"]) expect(buttons[name].x, name).toBeLessThan(width * 0.3);
    for (const name of ["attack", "jump", "down"]) expect(buttons[name].x, name).toBeGreaterThan(width - 300);
    // O agachar fica ao lado do ataque, na mesma altura, e o pulo acima dele.
    expect(Math.abs(buttons.down.y - buttons.attack.y)).toBeLessThan(40);
    expect(buttons.jump.y).toBeLessThan(buttons.attack.y - 100);
  });

  test("os botões ficam dentro da tela e o de ataque encostado na borda direita", async ({ page }) => {
    const { buttons, width } = await page.evaluate(() => ({
      buttons: window.__game.scene.getScene("touchControls").buttons,
      width: window.__game.scale.width,
    }));
    for (const [name, b] of Object.entries(buttons)) {
      expect(b.x - b.radius, name).toBeGreaterThanOrEqual(0);
      expect(b.x + b.radius, name).toBeLessThanOrEqual(width);
    }
    expect(width - buttons.attack.x).toBeLessThan(100);
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

  test("na tela inicial, um toque abre o menu e tocar em Solo começa o jogo", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.__game?.scene.isActive("start"), null, { timeout: 30_000 });
    await page.waitForTimeout(500);
    await page.touchscreen.tap(400, 200);
    await page.waitForFunction(() => window.__game.scene.getScene("start").menu !== null, null, { timeout: 10_000 });
    const names = await page.evaluate(() => Object.keys(window.__game.scene.getScene("start").menu.buttons));
    expect(names).toContain("solo");
    expect(names).not.toContain("local"); // dois jogadores no mesmo aparelho só no computador
    const solo = await page.evaluate(() => window.__game.scene.getScene("start").menu.buttons.solo);
    const at = await new Fingers(page, null).toPage(solo.x, solo.y);
    await page.touchscreen.tap(at.x, at.y);
    await page.waitForFunction(() => window.__game.scene.isActive("game"), null, { timeout: 30_000 });
    expect(await page.evaluate(`${scene}.mode.name`)).toBe("solo");
  });

  test("em tela cheia a caixa do código da sala continua visível (fica dentro do elemento em tela cheia)", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.__game?.scene.isActive("start"), null, { timeout: 30_000 });
    await page.waitForTimeout(500);
    await page.touchscreen.tap(400, 200); // abre o menu e entra em tela cheia
    await page.waitForFunction(() => window.__game.scene.getScene("start").menu !== null, null, { timeout: 10_000 });
    await page.evaluate(() => window.__game.scene.getScene("start").menu.activate("online"));
    await page.evaluate(() => window.__game.scene.getScene("start").menu.activate("join"));
    await page.waitForSelector("input[data-testid=room-code]");
    const info = await page.evaluate(() => {
      const input = document.querySelector("input[data-testid=room-code]");
      const r = input.getBoundingClientRect();
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      const host = document.fullscreenElement ?? document.body;
      return { onTop: top === input, insideHost: host.contains(input) };
    });
    expect(info).toEqual({ onTop: true, insideHost: true });
  });

  test("o toque na tela inicial pede tela cheia, para esconder a barra do navegador", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.__game?.scene.isActive("start"), null, { timeout: 30_000 });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      window.__fullscreenAsked = false;
      const scale = window.__game.scale;
      const start = scale.startFullscreen.bind(scale);
      scale.startFullscreen = (...args) => {
        window.__fullscreenAsked = true;
        return start(...args);
      };
    });
    await page.touchscreen.tap(400, 200); // o primeiro toque abre o menu e já pede a tela cheia
    await page.waitForFunction(() => window.__game.scene.getScene("start").menu !== null, null, { timeout: 10_000 });
    expect(await page.evaluate(() => window.__fullscreenAsked)).toBe(true);
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
