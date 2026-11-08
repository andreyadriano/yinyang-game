import { test, expect } from "@playwright/test";

const scene = "window.__game.scene.getScene('game')";

// Testes da base para o online: ids estáveis, snapshot em JSON, restauração, eventos e passo fixo.

async function startGame(page) {
  await page.goto("/");
  await page.waitForFunction(() => window.__game?.scene.isActive("start"), null, { timeout: 30_000 });
  await page.evaluate(() => {
    window.__game.scene.getScene("start").scene.start("game");
  });
  await page.waitForFunction(() => window.__game.scene.isActive("game"), null, { timeout: 30_000 });
  await page.waitForTimeout(500);
}

test.beforeEach(async ({ page }) => {
  page.errors = [];
  page.on("pageerror", (err) => page.errors.push(err.message));
  await startGame(page);
});

test.afterEach(async ({ page }) => {
  expect(page.errors).toEqual([]);
});

const place = (page, index, x, y) =>
  page.evaluate(
    ([i, px, py]) => {
      const sprite = window.__game.scene.getScene("game").players[i].sprite;
      sprite.setPosition(px, py);
      sprite.setVelocity(0, 0);
    },
    [index, x, y]
  );

// Grava num array da página os eventos do jogo que acontecerem.
const recordEvents = (page) =>
  page.evaluate(() => {
    const game = window.__game.scene.getScene("game");
    window.__events = [];
    for (const name of [
      "soul-lost", "player-hit", "enemy-hurt", "enemy-defeated", "key-collected",
      "barrier-opened", "boss-defeated", "jail-door-opened", "game-over", "endgame",
    ]) {
      game.state.events.on(name, (data) => window.__events.push({ name, ...data }));
    }
  });

const eventsNamed = (page, name) => page.evaluate((n) => window.__events.filter((e) => e.name === n), name);

test.describe("ids estáveis", () => {
  test("toda entidade com estado tem um id único e previsível", async ({ page }) => {
    const ids = await page.evaluate(`${scene}.entities.ids()`);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(
      expect.arrayContaining([
        "player-yin", "player-yang", "slime-0", "slime-16", "skeleton-0", "skeleton-11",
        "demon-0", "demon-1", "key-0", "key-1", "barrier-0", "barrier-1", "jailDoor-0",
        "flamethrower-0", "jumper-0",
      ])
    );
  });

  test("dois carregamentos do jogo geram exatamente os mesmos ids", async ({ browser }) => {
    const idsOf = async () => {
      const page = await browser.newPage();
      await startGame(page);
      const ids = await page.evaluate(`${scene}.entities.ids()`);
      await page.close();
      return ids;
    };
    expect(await idsOf()).toEqual(await idsOf());
  });

  test("cada entidade sabe o próprio id e o próprio tipo", async ({ page }) => {
    const info = await page.evaluate(`({
      slime: [${scene}.slimes[3].id, ${scene}.slimes[3].kind],
      key: [${scene}.keys[1].id, ${scene}.keys[1].kind, ${scene}.keys[1].color],
      yin: [${scene}.players[0].id, ${scene}.players[0].kind],
    })`);
    expect(info).toEqual({
      slime: ["slime-3", "slime"],
      key: ["key-1", "key", "blue"],
      yin: ["player-yin", "player"],
    });
  });
});

test.describe("snapshot", () => {
  test("é JSON puro: sobrevive a stringify e parse sem perder nada", async ({ page }) => {
    const { original, copy } = await page.evaluate(async () => {
      const { takeSnapshot } = await import("/src/sim/snapshot.js");
      const snapshot = takeSnapshot(window.__game.scene.getScene("game"));
      return { original: snapshot, copy: JSON.parse(JSON.stringify(snapshot)) };
    });
    expect(copy).toEqual(original);
    expect(original.version).toBe(1);
    expect(Object.keys(original.entities).length).toBeGreaterThan(60);
  });

  test("não tem NaN, undefined nem função em lugar nenhum", async ({ page }) => {
    const problems = await page.evaluate(async () => {
      const { takeSnapshot } = await import("/src/sim/snapshot.js");
      const snapshot = takeSnapshot(window.__game.scene.getScene("game"));
      const found = [];
      const walk = (value, path) => {
        if (value === undefined || typeof value === "function") found.push(path);
        else if (typeof value === "number" && !Number.isFinite(value)) found.push(`${path}=${value}`);
        else if (value && typeof value === "object") Object.entries(value).forEach(([k, v]) => walk(v, `${path}.${k}`));
      };
      walk(snapshot, "snapshot");
      return found;
    });
    expect(problems).toEqual([]);
  });

  test("restaurar devolve o jogo ao estado da foto (posições, vida, inimigos, chaves)", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { takeSnapshot, applySnapshot } = await import("/src/sim/snapshot.js");
      const game = window.__game.scene.getScene("game");

      const before = JSON.parse(JSON.stringify(takeSnapshot(game)));

      // Bagunça o mundo à mão.
      game.players[0].sprite.setPosition(2000, 1000);
      game.players[1].sprite.setPosition(2100, 1000);
      game.state.soulCount = 50;
      game.state.keys.yellow = true;
      game.state.bossesDefeated = 1;
      game.slimes[0].health = 3;
      game.slimes[0].sprite.setPosition(1234, 777);
      game.skeletons[0].sprite.disableBody(true, true);
      game.keys[0].sprite.disableBody(true, true);
      game.barriers[0].isOpening = true;

      applySnapshot(game, before);
      const after = JSON.parse(JSON.stringify(takeSnapshot(game)));
      return { before, after };
    });

    expect(result.after.game).toEqual(result.before.game);
    expect(result.after.entities).toEqual(result.before.entities);
  });

  test("restaurar traz de volta um inimigo morto, que volta a se mexer", async ({ page }) => {
    const before = await page.evaluate(async () => {
      const { takeSnapshot } = await import("/src/sim/snapshot.js");
      window.__before = JSON.parse(JSON.stringify(takeSnapshot(window.__game.scene.getScene("game"))));
      return window.__before.entities["slime-0"].health;
    });

    await page.evaluate(`${scene}.slimes[0].health = 0`);
    await page.waitForFunction(`${scene}.slimes[0].sprite.active === false`, null, { timeout: 5000 });

    await page.evaluate(async () => {
      const { applySnapshot } = await import("/src/sim/snapshot.js");
      applySnapshot(window.__game.scene.getScene("game"), window.__before);
    });
    expect(await page.evaluate(`${scene}.slimes[0].sprite.active`)).toBe(true);
    expect(await page.evaluate(`${scene}.slimes[0].health`)).toBe(before);
    expect(await page.evaluate(`${scene}.slimes[0].state`)).toBe("free");

    // E ele patrulha de novo (anda sozinho).
    const x0 = await page.evaluate(`${scene}.slimes[0].sprite.x`);
    await page.waitForTimeout(800);
    expect(Math.abs((await page.evaluate(`${scene}.slimes[0].sprite.x`)) - x0)).toBeGreaterThan(5);
  });

  test("uma versão desconhecida é recusada", async ({ page }) => {
    const message = await page.evaluate(async () => {
      const { applySnapshot } = await import("/src/sim/snapshot.js");
      try {
        applySnapshot(window.__game.scene.getScene("game"), { version: 99 });
        return null;
      } catch (error) {
        return error.message;
      }
    });
    expect(message).toMatch(/Unsupported snapshot version/);
  });

  test("tamanho de um snapshot da fase inteira (referência para a rede)", async ({ page }) => {
    const bytes = await page.evaluate(async () => {
      const { takeSnapshot } = await import("/src/sim/snapshot.js");
      return JSON.stringify(takeSnapshot(window.__game.scene.getScene("game"))).length;
    });
    console.log(`snapshot completo: ${bytes} bytes`);
    expect(bytes).toBeLessThan(80_000);
  });
});

test.describe("eventos", () => {
  test("perder vida avisa quem causou: espinhos", async ({ page }) => {
    await recordEvents(page);
    await place(page, 0, 590, 465);
    await page.waitForFunction(() => window.__events.some((e) => e.name === "soul-lost"), null, { timeout: 5000 });
    const [event] = await eventsNamed(page, "soul-lost");
    expect(event).toMatchObject({ amount: 4, source: "spikes" });
    expect(event.soulCount).toBeLessThan(190);
  });

  test("perder vida avisa quem causou: um inimigo, e o jogador atingido", async ({ page }) => {
    await recordEvents(page);
    const slimeX = await page.evaluate(`${scene}.slimes[0].sprite.x`);
    await place(page, 1, slimeX + 25, 350);
    await page.waitForFunction(() => window.__events.some((e) => e.name === "soul-lost"), null, { timeout: 8000 });
    const [lost] = await eventsNamed(page, "soul-lost");
    expect(lost).toMatchObject({ amount: 5, source: expect.stringMatching(/^(slime|skeleton)-\d+$/) });
    const hits = await eventsNamed(page, "player-hit");
    expect(hits[0]).toEqual({ name: "player-hit", id: "player-yang" });
  });

  test("pegar a chave e abrir a barreira avisam, cada um uma vez", async ({ page }) => {
    await recordEvents(page);
    await place(page, 0, 3700, 1500);
    await page.waitForFunction(`${scene}.state.keys.yellow === true`, null, { timeout: 5000 });
    await place(page, 0, 2695, 1880);
    await page.keyboard.down("ArrowRight");
    await page.waitForFunction(`${scene}.barriers[0].isOpen === true`, null, { timeout: 8000 });
    await page.keyboard.up("ArrowRight");

    expect(await eventsNamed(page, "key-collected")).toEqual([{ name: "key-collected", key: "yellow" }]);
    expect(await eventsNamed(page, "barrier-opened")).toEqual([{ name: "barrier-opened", id: "barrier-0" }]);
  });

  test("um inimigo ferido e derrotado avisa com id e tipo", async ({ page }) => {
    await recordEvents(page);
    await page.evaluate(`${scene}.skeletons[2].hurt()`);
    await page.evaluate(`${scene}.skeletons[2].health = 0`);
    await page.waitForFunction(() => window.__events.some((e) => e.name === "enemy-defeated"), null, { timeout: 8000 });

    expect(await eventsNamed(page, "enemy-hurt")).toEqual([{ name: "enemy-hurt", id: "skeleton-2", kind: "skeleton" }]);
    expect(await eventsNamed(page, "enemy-defeated")).toEqual([{ name: "enemy-defeated", id: "skeleton-2", kind: "skeleton" }]);
  });

  test("cada chefe derrotado avisa com a contagem, e a porta avisa ao abrir", async ({ page }) => {
    await recordEvents(page);
    await page.evaluate(`${scene}.demons[0].health = 0`);
    await page.waitForFunction(`${scene}.state.bossesDefeated === 1`, null, { timeout: 8000 });
    await page.evaluate(`${scene}.demons[1].health = 0`);
    await page.waitForFunction(`${scene}.state.bossesDefeated === 2`, null, { timeout: 8000 });
    expect(await eventsNamed(page, "boss-defeated")).toEqual([
      { name: "boss-defeated", id: "demon-0", total: 1 },
      { name: "boss-defeated", id: "demon-1", total: 2 },
    ]);

    const door = await page.evaluate(`({ x: ${scene}.jailDoor.sprite.x, y: ${scene}.jailDoor.sprite.y })`);
    await place(page, 0, door.x - 40, door.y);
    await page.keyboard.down("ArrowRight");
    await page.waitForFunction(() => window.__game.scene.isActive("credits"), null, { timeout: 15_000 });
    await page.keyboard.up("ArrowRight");
    expect(await eventsNamed(page, "jail-door-opened")).toHaveLength(1);
    expect(await eventsNamed(page, "endgame")).toHaveLength(1);
  });

  test("game over avisa uma vez só", async ({ page }) => {
    await recordEvents(page);
    await page.evaluate(`${scene}.state.soulCount = 0`);
    await page.waitForFunction(() => window.__game.scene.isActive("gameOver"), null, { timeout: 15_000 });
    expect(await eventsNamed(page, "game-over")).toHaveLength(1);
  });
});

test.describe("sons", () => {
  test("os efeitos sonoros são anunciados com nome e volume, para o host repassar ao convidado", async ({ page }) => {
    await page.evaluate(() => {
      window.__sounds = [];
      window.__game.scene.getScene("game").audio.events.on("play", (e) => window.__sounds.push(e));
    });
    await page.keyboard.down("ArrowUp");
    await page.waitForFunction(() => window.__sounds.some((s) => s.name === "jump"), null, { timeout: 5000 });
    await page.keyboard.up("ArrowUp");
    const jump = await page.evaluate(() => window.__sounds.find((s) => s.name === "jump"));
    expect(jump).toEqual({ name: "jump", volume: 0.3 });
  });

  test("a música não é anunciada (cada aparelho toca a sua)", async ({ page }) => {
    const names = await page.evaluate(() => {
      const audio = window.__game.scene.getScene("game").audio;
      const heard = [];
      audio.events.on("play", (e) => heard.push(e.name));
      audio.playWhenUnlocked("music", { loop: true, volume: 0 });
      audio.get("music").stop();
      return heard;
    });
    expect(names).toEqual([]);
  });
});

test.describe("passo fixo", () => {
  test("a lógica roda ~60 passos por segundo, mesmo com poucos quadros por segundo", async ({ page }) => {
    // Nos primeiros 120 quadros (e sempre que a janela perde o foco) o Phaser limita o delta a 1/60 s;
    // depois disso ele entrega o tempo real. Espera esse período passar antes de medir.
    await page.waitForFunction(() => window.__game.loop.frame > 220, null, { timeout: 60_000 });

    // Mede dentro da página, com o mesmo relógio para os passos e para o tempo.
    const { seconds, ticks, fps } = await page.evaluate(async () => {
      const game = window.__game.scene.getScene("game");
      const t0 = game.stepper.tick;
      const start = performance.now();
      await new Promise((resolve) => setTimeout(resolve, 2500));
      return {
        seconds: (performance.now() - start) / 1000,
        ticks: game.stepper.tick - t0,
        fps: window.__game.loop.actualFps,
      };
    });
    console.log(`passo fixo: ${(ticks / seconds).toFixed(1)} passos/s com ${fps.toFixed(0)} quadros/s`);
    // Abaixo de ~12 quadros por segundo o passo fixo descarta tempo de propósito (máximo de 5 passos por quadro).
    test.skip(fps < 15, "quadros por segundo baixos demais para medir");
    expect(ticks / seconds).toBeGreaterThan(50);
    expect(ticks / seconds).toBeLessThan(70);
  });
});
