import { test, expect } from "@playwright/test";

// Testes de comportamento: exercitam as mecânicas principais direto na cena do jogo.

const scene = "window.__game.scene.getScene('game')";

test.beforeEach(async ({ page }) => {
  page.errors = [];
  page.on("pageerror", (err) => page.errors.push(err.message));
  await page.goto("/");
  await page.waitForFunction(() => window.__game?.scene.isActive("start"), null, { timeout: 20_000 });
  await page.evaluate(() => window.__game.scene.getScene("start").scene.start("game"));
  await page.waitForFunction(() => window.__game.scene.isActive("game"), null, { timeout: 30_000 });
  await page.waitForTimeout(500);
});

test.afterEach(async ({ page }) => {
  expect(page.errors).toEqual([]);
});

// Move o jogador (0 = Yin, 1 = Yang) para uma posição do mapa.
const place = (page, index, x, y) =>
  page.evaluate(
    ([i, px, py]) => {
      const sprite = window.__game.scene.getScene("game").players[i].sprite;
      sprite.setPosition(px, py);
      sprite.setVelocity(0, 0);
    },
    [index, x, y]
  );

test("a cena tem dois jogadores com id e personagem", async ({ page }) => {
  const players = await page.evaluate(() =>
    window.__game.scene.getScene("game").players.map((p) => ({ id: p.id, character: p.character }))
  );
  expect(players).toEqual([
    { id: 1, character: "yin" },
    { id: 2, character: "yang" },
  ]);
});

test("as setas movem o Yin e WASD move o Yang, cada um no seu controle", async ({ page }) => {
  const xs = () => page.evaluate(() => window.__game.scene.getScene("game").players.map((p) => p.sprite.x));
  const before = await xs();

  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(500);
  await page.keyboard.up("ArrowRight");
  const afterYin = await xs();
  expect(afterYin[0]).toBeGreaterThan(before[0] + 50);
  expect(Math.abs(afterYin[1] - before[1])).toBeLessThan(5);

  await page.keyboard.down("d");
  await page.waitForTimeout(500);
  await page.keyboard.up("d");
  const afterYang = await xs();
  expect(afterYang[1]).toBeGreaterThan(afterYin[1] + 50);
});

test("espinhos machucam qualquer um dos jogadores", async ({ page }) => {
  for (const index of [0, 1]) {
    await page.evaluate(`${scene}.state.soulCount = 190`);
    await place(page, index, 590, 465);
    await page.waitForTimeout(800);
    const soul = await page.evaluate(`${scene}.state.soulCount`);
    expect(soul, `jogador ${index} nos espinhos`).toBeLessThan(190);
    await place(page, index, 100, 350);
    await page.waitForTimeout(1200);
  }
});

test("um slime ataca o jogador mais próximo, seja o Yin ou o Yang", async ({ page }) => {
  for (const index of [0, 1]) {
    await page.evaluate(`${scene}.state.soulCount = 190`);
    // O slime em (400, 350) patrulha perto do ponto de origem; o jogador fica ao lado dele.
    const slimeX = await page.evaluate(`${scene}.slimes[0].sprite.x`);
    await place(page, index, slimeX + 25, 350);
    await page.waitForTimeout(2500);
    const soul = await page.evaluate(`${scene}.state.soulCount`);
    expect(soul, `jogador ${index} perto do slime`).toBeLessThan(190);
    await place(page, index, 100, 350);
    await page.waitForTimeout(500);
  }
});

test("atacar derruba o slime", async ({ page }) => {
  const slimeX = await page.evaluate(`${scene}.slimes[0].sprite.x`);
  await place(page, 0, slimeX + 25, 350);
  // Mantém Enter apertado para encadear o combo de ataques.
  await page.keyboard.down("Enter");
  await page.waitForTimeout(4000);
  await page.keyboard.up("Enter");
  const health = await page.evaluate(`${scene}.slimes[0].health`);
  expect(health).toBeLessThan(20);
});

test("pegar a chave amarela e encostar na barreira 1 a abre", async ({ page }) => {
  await place(page, 0, 3700, 1500);
  await page.waitForFunction(`${scene}.state.hasYellowKey === true`, null, { timeout: 5000 });
  expect(await page.evaluate(`${scene}.keys[0].sprite.active`)).toBe(false);

  await place(page, 0, 2695, 1880);
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(`${scene}.barriers[0].isOpen === true`, null, { timeout: 8000 });
  await page.keyboard.up("ArrowRight");
  expect(await page.evaluate(`${scene}.state.hasYellowKey`)).toBe(false);
});

test("a barreira 2 só abre com a chave azul", async ({ page }) => {
  await place(page, 1, 2695, 2085);
  await page.keyboard.down("d");
  await page.waitForTimeout(1500);
  expect(await page.evaluate(`${scene}.barriers[1].isOpening`)).toBe(false);
  await page.keyboard.up("d");

  await place(page, 1, 3830, 1480);
  await page.waitForFunction(`${scene}.state.hasBlueKey === true`, null, { timeout: 5000 });
  await place(page, 1, 2695, 2085);
  await page.keyboard.down("d");
  await page.waitForFunction(`${scene}.barriers[1].isOpen === true`, null, { timeout: 8000 });
  await page.keyboard.up("d");
});

test("o jumper lança o jogador para cima", async ({ page }) => {
  await place(page, 1, 496, 1775);
  // O jumper afunda, sobe e então lança o jogador a ~900 px/s para cima.
  await page.waitForFunction(
    `${scene}.players[1].sprite.body.velocity.y < -700`,
    null,
    { timeout: 6000, polling: "raf" }
  );
});

test("o portal teleporta o jogador", async ({ page }) => {
  await place(page, 0, 3770, 1650);
  await page.waitForFunction(
    `Math.abs(${scene}.players[0].sprite.x - 1307) < 80`,
    null,
    { timeout: 5000 }
  );
});

for (const [name, list] of [
  ["um esqueleto", "skeletons"],
  ["um demônio", "demons"],
]) {
  test(`${name} machuca o jogador mais próximo, seja o Yin ou o Yang`, async ({ page }) => {
    for (const index of [0, 1]) {
      await page.evaluate(`${scene}.state.soulCount = 190`);
      const { x, y } = await page.evaluate(`({ x: ${scene}.${list}[0].sprite.x, y: ${scene}.${list}[0].sprite.y })`);
      await place(page, index, x + 25, y - 10);
      await page.waitForFunction(`${scene}.state.soulCount < 190`, null, { timeout: 15_000 });
      await place(page, index, 100, 350);
      await page.waitForTimeout(500);
    }
  });
}

test("o lança-chamas machuca qualquer um dos jogadores", async ({ page }) => {
  // Cada jogador caminha para a esquerda, em direção ao lança-chamas (Yin: seta; Yang: A).
  for (const [index, key] of [[0, "ArrowLeft"], [1, "a"]]) {
    await page.evaluate(`${scene}.state.soulCount = 190`);
    const { x, y } = await page.evaluate(`({ x: ${scene}.flamethrowers[0].sprite.x, y: ${scene}.flamethrowers[0].sprite.y })`);
    await place(page, index, x + 45, y);
    await page.keyboard.down(key);
    await page.waitForFunction(`${scene}.state.soulCount < 190`, null, { timeout: 15_000 });
    await page.keyboard.up(key);
    await place(page, index, 100, 350);
    await page.waitForTimeout(500);
  }
});

test("com os dois chefes derrotados, a porta da cela abre e leva aos créditos", async ({ page }) => {
  await page.evaluate(`${scene}.state.bossesDefeated = 2`);
  const { x, y } = await page.evaluate(`({ x: ${scene}.jailDoor.sprite.x, y: ${scene}.jailDoor.sprite.y })`);
  await place(page, 0, x - 40, y);
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(() => window.__game.scene.isActive("credits"), null, { timeout: 15_000 });
  await page.keyboard.up("ArrowRight");
});

// ---------- camada de entrada e máquina de estados do jogador ----------

test("o jogador obedece à intenção de qualquer fonte de entrada, sem teclado", async ({ page }) => {
  await page.evaluate(() => {
    const player = window.__game.scene.getScene("game").players[0];
    player.input = { read: () => ({ left: false, right: true, up: false, down: false, attack: false }) };
  });
  const before = await page.evaluate(`${scene}.players[0].sprite.x`);
  await page.waitForTimeout(600);
  const after = await page.evaluate(`${scene}.players[0].sprite.x`);
  expect(after).toBeGreaterThan(before + 50);
});

test("o ataque trava o jogador até a animação acabar e então ele volta ao estado livre", async ({ page }) => {
  await page.keyboard.down("Enter");
  await page.waitForFunction(`${scene}.players[0].state === "attack"`, null, { timeout: 3000 });
  await page.keyboard.up("Enter");
  expect(await page.evaluate(`${scene}.players[0].isAttacking()`)).toBe(true);
  await page.waitForFunction(`${scene}.players[0].state === "free"`, null, { timeout: 3000 });
  expect(await page.evaluate(`${scene}.players[0].sprite.anims.getCurrentKey()`)).toBe("yin-idle");
});

test("o combo de ataque encadeia attack1, attack2, attack3 e recomeça", async ({ page }) => {
  await page.evaluate(() => {
    const player = window.__game.scene.getScene("game").players[0];
    window.__attacks = [];
    const original = player.startAttack.bind(player);
    player.startAttack = () => {
      original();
      window.__attacks.push(player.sprite.anims.getCurrentKey());
    };
  });
  await page.keyboard.down("Enter");
  await page.waitForFunction(() => window.__attacks.length >= 4, null, { timeout: 8000, polling: "raf" });
  await page.keyboard.up("Enter");
  const attacks = await page.evaluate(() => window.__attacks.slice(0, 4));
  expect(attacks).toEqual(["yin-attack1", "yin-attack2", "yin-attack3", "yin-attack1"]);
});

test("ao ser ferido o jogador fica vermelho e depois volta ao normal", async ({ page }) => {
  await page.evaluate(`${scene}.players[0].takeHit(-125, -100)`);
  expect(await page.evaluate(`${scene}.players[0].state`)).toBe("hurt");
  await page.waitForFunction(`${scene}.players[0].state === "free"`, null, { timeout: 3000 });
  expect(await page.evaluate(`${scene}.players[0].sprite.isTinted`)).toBe(false);
});

test("o segundo pulo no ar só vale depois do tempo de espera", async ({ page }) => {
  await page.evaluate(() => {
    const sprite = window.__game.scene.getScene("game").players[0].sprite;
    window.__jumps = 0;
    let previous = 0;
    const count = () => {
      const vy = sprite.body.velocity.y;
      if (vy <= -340 && previous > -340) window.__jumps++;
      previous = vy;
      requestAnimationFrame(count);
    };
    count();
  });
  await page.keyboard.down("ArrowUp");
  await page.waitForFunction(() => window.__jumps >= 2, null, { timeout: 6000, polling: "raf" });
  await page.keyboard.up("ArrowUp");
});

test("quando a vida acaba o jogador morre e o jogo vai para a tela de game over", async ({ page }) => {
  await page.evaluate(`${scene}.state.soulCount = 0`);
  await page.waitForFunction(`${scene}.players[0].isDead() && ${scene}.players[1].isDead()`, null, { timeout: 3000 });
  await page.waitForFunction(() => window.__game.scene.isActive("gameOver"), null, { timeout: 10_000 });
});
