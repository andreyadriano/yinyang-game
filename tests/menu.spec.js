import { test, expect, devices } from "@playwright/test";

// O menu de modo da tela inicial: aparece depois do primeiro toque e cada opção inicia o modo certo.

const game = "window.__game.scene.getScene('game')";
const start = "window.__game.scene.getScene('start')";

const phone = { ...devices["Pixel 7 landscape"] };
delete phone.defaultBrowserType;

async function openStart(browser, query = "", options = {}) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", (err) => page.errors.push(err.message));
  await page.goto(`/?${query}`);
  await page.waitForFunction(() => window.__game?.scene.isActive("start"), null, { timeout: 30_000 });
  return page;
}

// Posição de um ponto do jogo (800x600) na página.
async function toPage(page, gx, gy) {
  const rect = await page.evaluate(() => {
    const r = document.querySelector("canvas").getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  });
  return { x: rect.left + (gx * rect.width) / 800, y: rect.top + (gy * rect.height) / 600 };
}

// Primeiro clique na tela inicial (abre o menu).
async function tapToOpenMenu(page) {
  const { x, y } = await toPage(page, 400, 560);
  await page.mouse.click(x, y);
  await page.waitForFunction(`${start}.menu !== null`);
}

// Clica no botão do menu pelo nome, com o mouse de verdade.
async function clickButton(page, name) {
  const button = await page.evaluate((n) => window.__game.scene.getScene("start").menu.buttons[n], name);
  expect(button, `botão ${name}`).toBeTruthy();
  const { x, y } = await toPage(page, button.x, button.y);
  await page.mouse.click(x, y);
}

// O Phaser processa as teclas no quadro seguinte, então espera um pouco depois de apertar.
async function press(page, key) {
  await page.keyboard.press(key);
  await page.waitForTimeout(150);
}

const buttonNames = (page) => page.evaluate(`Object.keys(${start}.menu.buttons)`);

async function waitForGame(page) {
  await page.waitForFunction(() => window.__game.scene.isActive("game"), null, { timeout: 30_000 });
}

test.describe("menu de modo", () => {
  test("aparece só depois do primeiro toque, com as três opções", async ({ browser }) => {
    const page = await openStart(browser);
    expect(await page.evaluate(`${start}.menu`)).toBeNull();
    await tapToOpenMenu(page);
    expect(await buttonNames(page)).toEqual(["solo", "local", "online"]);
    expect(await page.evaluate(() => window.__game.scene.isActive("game"))).toBe(false);
    expect(page.errors).toEqual([]);
    await page.context().close();
  });

  test("Solo: um jogador e câmera única", async ({ browser }) => {
    const page = await openStart(browser);
    await tapToOpenMenu(page);
    await clickButton(page, "solo");
    await waitForGame(page);
    expect(await page.evaluate(`${game}.mode.name`)).toBe("solo");
    expect(await page.evaluate(`${game}.players.length`)).toBe(1);
    expect(await page.evaluate(`${game}.cameras.cameras.length`)).toBe(1);
    expect(page.errors).toEqual([]);
    await page.context().close();
  });

  test("Co-op local: dois jogadores e tela dividida", async ({ browser }) => {
    const page = await openStart(browser);
    await tapToOpenMenu(page);
    await clickButton(page, "local");
    await waitForGame(page);
    expect(await page.evaluate(`${game}.mode.name`)).toBe("local");
    expect(await page.evaluate(`${game}.players.length`)).toBe(2);
    expect(await page.evaluate(`${game}.cameras.cameras.length`)).toBe(2);
    expect(page.errors).toEqual([]);
    await page.context().close();
  });

  test("o teclado também funciona: setas, Enter e Esc", async ({ browser }) => {
    const page = await openStart(browser);
    await tapToOpenMenu(page);
    await press(page, "ArrowDown");
    await press(page, "ArrowDown");
    await press(page, "Enter"); // Co-op online
    expect(await buttonNames(page)).toEqual(["host", "join", "back"]);
    await press(page, "Escape");
    expect(await buttonNames(page)).toEqual(["solo", "local", "online"]);
    await press(page, "Enter"); // Solo
    await waitForGame(page);
    expect(await page.evaluate(`${game}.mode.name`)).toBe("solo");
    await page.context().close();
  });
});

test.describe("co-op online pelo menu", () => {
  test("Criar sala: anfitrião com o código no topo", async ({ browser }) => {
    const page = await openStart(browser);
    await tapToOpenMenu(page);
    await clickButton(page, "online");
    expect(await buttonNames(page)).toEqual(["host", "join", "back"]);
    await clickButton(page, "host");
    await waitForGame(page);
    expect(await page.evaluate(`${game}.mode.name`)).toBe("online");
    expect(await page.evaluate(`${game}.mode.online.role`)).toBe("host");
    const room = await page.evaluate(`${game}.mode.online.room`);
    expect(room).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
    await page.waitForFunction(`${game}.session !== undefined`, null, { timeout: 15_000 });
    expect(await page.evaluate(`${game}.onlineStatus.text.text`)).toContain(`Sala ${room}`);
    expect(page.errors).toEqual([]);
    await page.context().close();
  });

  test("Voltar leva ao menu anterior", async ({ browser }) => {
    const page = await openStart(browser);
    await tapToOpenMenu(page);
    await clickButton(page, "online");
    await clickButton(page, "join");
    expect(await buttonNames(page)).toEqual(["enter", "back"]);
    expect(await page.locator("input[data-testid=room-code]").count()).toBe(1);
    await clickButton(page, "back");
    expect(await buttonNames(page)).toEqual(["host", "join", "back"]);
    expect(await page.locator("input[data-testid=room-code]").count()).toBe(0);
    await clickButton(page, "back");
    expect(await buttonNames(page)).toEqual(["solo", "local", "online"]);
    await page.context().close();
  });

  test("código inválido é recusado com uma mensagem", async ({ browser }) => {
    const page = await openStart(browser);
    await tapToOpenMenu(page);
    await clickButton(page, "online");
    await clickButton(page, "join");
    const input = page.locator("input[data-testid=room-code]");
    await expect(input).toHaveAttribute("maxlength", "6");
    await expect(input).toHaveAttribute("autocomplete", "off");

    for (const bad of ["", "AB2", "ABCDE0"]) {
      await input.fill(bad);
      await clickButton(page, "enter");
      expect(await page.evaluate(`${start}.menu.errorText.text`)).toContain("Código inválido");
      expect(await page.evaluate(() => window.__game.scene.isActive("game"))).toBe(false);
    }
    await page.context().close();
  });

  test("código válido (em minúsculas) leva ao jogo como convidado", async ({ browser }) => {
    const host = await openStart(browser, "online=host&room=MNWAAA");
    await host.evaluate(`${start}.scene.start("game")`);
    await host.waitForFunction(`${game}.session !== undefined`, null, { timeout: 15_000 });

    const guest = await openStart(browser);
    await tapToOpenMenu(guest);
    await clickButton(guest, "online");
    await clickButton(guest, "join");
    await guest.locator("input[data-testid=room-code]").fill("mnwaaa");
    expect(await guest.locator("input[data-testid=room-code]").inputValue()).toBe("MNWAAA");
    await guest.keyboard.press("Enter");
    await waitForGame(guest);
    expect(await guest.evaluate(`${game}.mode.online.role`)).toBe("guest");
    expect(await guest.evaluate(`${game}.mode.online.room`)).toBe("MNWAAA");
    expect(await guest.evaluate(`${game}.localPlayer.character`)).toBe("yang");
    await host.waitForFunction(`${game}.session.peerReady === true`, null, { timeout: 15_000, polling: 100 });
    expect(await host.evaluate(`${game}.remotePlayer.sprite.active`)).toBe(true);
    expect([...host.errors, ...guest.errors]).toEqual([]);
    await host.context().close();
    await guest.context().close();
  });
});

test.describe("URL que já define o modo", () => {
  test("o link de convite pula o menu", async ({ browser }) => {
    const host = await openStart(browser, "online=host&room=MNWBBB");
    await host.evaluate(`${start}.scene.start("game")`);
    await host.waitForFunction(`${game}.session !== undefined`, null, { timeout: 15_000 });

    const guest = await openStart(browser, "online=join&room=MNWBBB");
    const { x, y } = await toPage(guest, 400, 560);
    await guest.mouse.click(x, y);
    await waitForGame(guest);
    expect(await guest.evaluate(`${game}.mode.online.role`)).toBe("guest");
    expect(await guest.evaluate(`${start}.menu`)).toBeNull();
    await host.context().close();
    await guest.context().close();
  });

  test("?mode=solo e ?mode=local pulam o menu", async ({ browser }) => {
    for (const [mode, players] of [
      ["solo", 1],
      ["local", 2],
    ]) {
      const page = await openStart(browser, `mode=${mode}`);
      const { x, y } = await toPage(page, 400, 560);
      await page.mouse.click(x, y);
      await waitForGame(page);
      expect(await page.evaluate(`${game}.mode.name`)).toBe(mode);
      expect(await page.evaluate(`${game}.players.length`)).toBe(players);
      await page.context().close();
    }
  });

  test("sem escolha no menu, o padrão do aparelho continua (desktop: local)", async ({ browser }) => {
    const page = await openStart(browser);
    await page.evaluate(`${start}.scene.start("game")`);
    await waitForGame(page);
    expect(await page.evaluate(`${game}.mode.name`)).toBe("local");
    await page.context().close();
  });
});

test.describe("celular", () => {
  test("não oferece o co-op local", async ({ browser }) => {
    const page = await openStart(browser, "", phone);
    await page.touchscreen.tap(400, 300);
    await page.waitForFunction(`${start}.menu !== null`);
    expect(await buttonNames(page)).toEqual(["solo", "online"]);
    expect(await page.evaluate(`${start}.menu.buttons.solo.height`)).toBeGreaterThanOrEqual(70);
    await page.evaluate(`${start}.menu.activate("solo")`);
    await waitForGame(page);
    expect(await page.evaluate(`${game}.mode.name`)).toBe("solo");
    expect(page.errors).toEqual([]);
    await page.context().close();
  });
});
