import { test, expect } from "@playwright/test";

// Co-op online de ponta a ponta: duas páginas do navegador (host e convidado) jogando uma com a
// outra através do servidor de repasse (node server/relay.js, subido pela configuração dos testes).

const scene = "window.__game.scene.getScene('game')";

// Por padrão os testes usam o servidor local em Node. Com RELAY=ws://localhost:8788 (e `npm run worker:dev`
// rodando) a mesma suíte passa pelo Worker da Cloudflare: npm run test:online-worker
const relay = process.env.RELAY;

async function open(browser, query) {
  if (relay && !query.includes("relay=")) query += `&relay=${relay}`;
  const context = await browser.newContext();
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

// Abre o anfitrião e o convidado e espera os dois estarem de fato jogando juntos.
async function pair(browser, room) {
  const host = await open(browser, `online=host&room=${room}`);
  await host.waitForFunction(`${scene}.session !== undefined`, null, { timeout: 15_000 });
  const guest = await open(browser, `online=join&room=${room}`);
  await host.waitForFunction(`${scene}.session.peerReady === true`, null, { timeout: 15_000, polling: 100 });
  await guest.waitForFunction(`${scene}.session?.base !== null && ${scene}.session?.base !== undefined`, null, {
    timeout: 15_000,
    polling: 100,
  });
  return { host, guest };
}

const closeAll = (...pages) => Promise.all(pages.map((page) => page.context().close()));
const statusText = (page) => page.evaluate(`${scene}.onlineStatus.text.text`);

test.describe("conexão", () => {
  test("o anfitrião espera sozinho, e o amigo aparece quando entra", async ({ browser }) => {
    const host = await open(browser, "online=host&room=WAAA");
    await host.waitForFunction(`${scene}.session !== undefined`, null, { timeout: 15_000 });

    // Sozinho: a sala existe, o outro personagem está escondido e não conta para os inimigos.
    expect(await host.evaluate(`${scene}.remotePlayer.sprite.active`)).toBe(false);
    expect(await statusText(host)).toContain("Sala WAAA");
    expect(await statusText(host)).toContain("toque para enviar o link");

    const guest = await open(browser, "online=join&room=WAAA");
    await host.waitForFunction(`${scene}.session.peerReady === true`, null, { timeout: 15_000, polling: 100 });
    expect(await host.evaluate(`${scene}.remotePlayer.sprite.active`)).toBe(true);
    expect(await host.evaluate(`${scene}.remotePlayer.character`)).toBe("yang");
    expect(await statusText(host)).toContain("amigo conectado");
    expect(await statusText(guest)).toContain("conectado");

    expect([...(host.errors), ...(guest.errors)]).toEqual([]);
    await closeAll(host, guest);
  });

  test("o anfitrião joga de Yin e o convidado de Yang", async ({ browser }) => {
    const { host, guest } = await pair(browser, "WAAB");
    const roles = (page) => page.evaluate(`({ local: ${scene}.localPlayer.character, remote: ${scene}.remotePlayer.character, cameras: ${scene}.cameras.cameras.length })`);
    expect(await roles(host)).toEqual({ local: "yin", remote: "yang", cameras: 1 });
    expect(await roles(guest)).toEqual({ local: "yang", remote: "yin", cameras: 1 });
    await closeAll(host, guest);
  });

  test("entrar numa sala que não existe mostra o erro e volta para a tela inicial ao tocar", async ({ browser }) => {
    const guest = await open(browser, "online=join&room=WZZZ");
    await guest.waitForFunction(`${scene}.onlineStatus.error === true`, null, { timeout: 15_000 });
    expect(await statusText(guest)).toContain("Essa sala não existe");
    expect(await guest.evaluate(`${scene}.session === undefined`)).toBe(true);
    await guest.evaluate(`${scene}.onlineStatus.text.emit("pointerup")`);
    await guest.waitForFunction(() => window.__game.scene.isActive("start"), null, { timeout: 10_000 });
    await closeAll(guest);
  });

  test("criar uma sala que já existe é recusado", async ({ browser }) => {
    const first = await open(browser, "online=host&room=WAAC");
    await first.waitForFunction(`${scene}.session !== undefined`, null, { timeout: 15_000 });
    const second = await open(browser, "online=host&room=WAAC");
    await second.waitForFunction(`${scene}.onlineStatus.error === true`, null, { timeout: 15_000 });
    expect(await statusText(second)).toContain("já está em uso");
    await closeAll(first, second);
  });

  test("um terceiro jogador é recusado com a sala cheia", async ({ browser }) => {
    const { host, guest } = await pair(browser, "WAAD");
    const third = await open(browser, "online=join&room=WAAD");
    await third.waitForFunction(`${scene}.onlineStatus.error === true`, null, { timeout: 15_000 });
    expect(await statusText(third)).toContain("dois jogadores");
    // E a partida dos dois continua.
    expect(await host.evaluate(`${scene}.session.peerReady`)).toBe(true);
    await closeAll(host, guest, third);
  });

  test("sem servidor configurado, o modo online avisa em vez de travar", async ({ browser }) => {
    const page = await open(browser, "online=host&room=WAAE&relay=ws://localhost:1");
    await page.waitForFunction(`${scene}.onlineStatus.error === true`, null, { timeout: 15_000 });
    expect(await statusText(page)).toContain("Não foi possível conectar");
    // O jogo local continua funcionando mesmo sem conexão.
    const x0 = await page.evaluate(`${scene}.localPlayer.sprite.x`);
    await page.keyboard.down("ArrowRight");
    await page.waitForFunction(`${scene}.localPlayer.sprite.x > ${x0 + 40}`, null, { timeout: 8000 });
    await page.keyboard.up("ArrowRight");
    await closeAll(page);
  });
});

test.describe("o jogo dos dois", () => {
  test("o mundo do convidado espelha o do anfitrião", async ({ browser }) => {
    const { host, guest } = await pair(browser, "WAAF");
    await guest.waitForTimeout(1500);

    const read = (page) =>
      page.evaluate(`({
        slimes: ${scene}.slimes.map((s) => [Math.round(s.sprite.x), s.sprite.active, s.health]),
        keys: ${scene}.keys.map((k) => k.sprite.active),
        soul: ${scene}.state.soulCount,
      })`);
    const [h, g] = [await read(host), await read(guest)];
    expect(g.keys).toEqual(h.keys);
    expect(g.soul).toBe(h.soul);
    g.slimes.forEach(([x, active, health], i) => {
      expect(active).toBe(h.slimes[i][1]);
      expect(health).toBe(h.slimes[i][2]);
      expect(Math.abs(x - h.slimes[i][0]), `slime ${i}`).toBeLessThan(120); // patrulham; só conferimos que acompanham
    });
    await closeAll(host, guest);
  });

  test("o que o convidado aperta move o Yang nos dois lados", async ({ browser }) => {
    const { host, guest } = await pair(browser, "WAAG");
    const yangX = (page) => page.evaluate(`${scene}.players.find((p) => p.character === "yang").sprite.x`);
    const before = await yangX(host);

    await guest.keyboard.down("ArrowRight");
    await host.waitForFunction(`${scene}.players.find((p) => p.character === "yang").sprite.x > ${before + 80}`, null, {
      timeout: 10_000,
      polling: 100,
    });
    await guest.keyboard.up("ArrowRight");

    // O convidado vê o mesmo (chega por snapshot) e, parado, os dois concordam.
    await guest.waitForTimeout(800);
    await host.waitForTimeout(300);
    const [hx, gx] = [await yangX(host), await yangX(guest)];
    expect(Math.abs(hx - gx)).toBeLessThan(40);
    await closeAll(host, guest);
  });

  test("o que o anfitrião faz aparece para o convidado: o Yin anda", async ({ browser }) => {
    const { host, guest } = await pair(browser, "WAAH");
    const yinX = (page) => page.evaluate(`${scene}.players.find((p) => p.character === "yin").sprite.x`);
    const before = await yinX(guest);

    await host.keyboard.down("ArrowRight");
    await guest.waitForFunction(`${scene}.players.find((p) => p.character === "yin").sprite.x > ${before + 80}`, null, {
      timeout: 10_000,
      polling: 100,
    });
    await host.keyboard.up("ArrowRight");
    await closeAll(host, guest);
  });

  test("os sons do anfitrião são tocados no convidado", async ({ browser }) => {
    const { host, guest } = await pair(browser, "WAAJ");
    await guest.evaluate(() => {
      const audio = window.__game.scene.getScene("game").audio;
      window.__heard = [];
      const original = audio.playQuiet.bind(audio);
      audio.playQuiet = (name, config) => {
        window.__heard.push({ name, volume: config?.volume });
        original(name, config);
      };
    });
    await host.keyboard.down("ArrowUp");
    await guest.waitForFunction(() => window.__heard.some((s) => s.name === "jump"), null, { timeout: 10_000, polling: 100 });
    await host.keyboard.up("ArrowUp");
    expect(await guest.evaluate(() => window.__heard.find((s) => s.name === "jump"))).toEqual({ name: "jump", volume: 0.3 });
    await closeAll(host, guest);
  });

  test("pegar a chave no anfitrião: o convidado vê a chave sumir e a chave no estado", async ({ browser }) => {
    const { host, guest } = await pair(browser, "WAAK");
    await host.evaluate(() => {
      const sprite = window.__game.scene.getScene("game").localPlayer.sprite;
      sprite.setPosition(3700, 1500);
      sprite.setVelocity(0, 0);
    });
    await guest.waitForFunction(`${scene}.state.keys.yellow === true`, null, { timeout: 10_000, polling: 100 });
    await guest.waitForFunction(`${scene}.keys[0].sprite.active === false`, null, { timeout: 10_000, polling: 100 });
    await closeAll(host, guest);
  });

  test("um inimigo que morre no anfitrião some no convidado", async ({ browser }) => {
    const { host, guest } = await pair(browser, "WAAW");
    await host.evaluate(`${scene}.slimes[1].health = 0`);
    await guest.waitForFunction(`${scene}.slimes[1].sprite.active === false`, null, { timeout: 15_000, polling: 100 });
    await closeAll(host, guest);
  });

  test("a vida (HUD) do convidado acompanha a do anfitrião", async ({ browser }) => {
    const { host, guest } = await pair(browser, "WAAM");
    await host.evaluate(`${scene}.state.loseSoul(40, "teste")`);
    await guest.waitForFunction(`${scene}.state.soulCount === 150`, null, { timeout: 10_000, polling: 100 });
    await closeAll(host, guest);
  });

  test("os inimigos do anfitrião atacam o Yang do convidado", async ({ browser }) => {
    const { host, guest } = await pair(browser, "WAAN");
    const slimeX = await host.evaluate(`${scene}.slimes[0].sprite.x`);
    // O convidado se teleporta (isso é feito no anfitrião, que manda na posição).
    await host.evaluate(
      (x) => {
        const yang = window.__game.scene.getScene("game").remotePlayer.sprite;
        yang.setPosition(x + 25, 350);
        yang.setVelocity(0, 0);
      },
      slimeX
    );
    await host.waitForFunction(`${scene}.state.soulCount < 190`, null, { timeout: 15_000, polling: 100 });
    await guest.waitForFunction(`${scene}.state.soulCount < 190`, null, { timeout: 15_000, polling: 100 });
    await closeAll(host, guest);
  });
});

test.describe("rede", () => {
  test("o fluxo de dados cabe numa rede de celular", async ({ browser }) => {
    const { host, guest } = await pair(browser, "WAAP");
    await guest.evaluate(() => {
      const socket = window.__game.scene.getScene("game").session.transport.socket;
      window.__bytes = 0;
      window.__snapshots = 0;
      socket.addEventListener("message", (event) => {
        window.__bytes += event.data.length;
        if (event.data.includes('"t":"snapshot"')) window.__snapshots++;
      });
    });
    // Com o anfitrião andando, para ter o que enviar.
    await host.keyboard.down("ArrowRight");
    const seconds = 4;
    await guest.waitForTimeout(seconds * 1000);
    await host.keyboard.up("ArrowRight");

    const { bytes, snapshots } = await guest.evaluate(() => ({ bytes: window.__bytes, snapshots: window.__snapshots }));
    const bytesPerSecond = bytes / seconds;
    const snapshotsPerSecond = snapshots / seconds;
    console.log(`rede: ${bytesPerSecond.toFixed(0)} bytes/s, ${snapshotsPerSecond.toFixed(1)} snapshots/s`);
    expect(snapshotsPerSecond).toBeGreaterThan(8);
    expect(snapshotsPerSecond).toBeLessThan(25);
    expect(bytesPerSecond).toBeLessThan(40_000);
    await closeAll(host, guest);
  });
});

test.describe("saídas", () => {
  test("quando o convidado sai, o Yang some do anfitrião e deixa de ser alvo", async ({ browser }) => {
    const { host, guest } = await pair(browser, "WAAQ");
    await guest.context().close();
    await host.waitForFunction(`${scene}.session.peerReady === false`, null, { timeout: 15_000, polling: 100 });
    expect(await host.evaluate(`${scene}.remotePlayer.sprite.active`)).toBe(false);
    expect(await statusText(host)).toContain("toque para enviar o link");
    expect(await host.evaluate(`${scene}.slimes[0].activePlayers().map((p) => p.character)`)).toEqual(["yin"]);
    await closeAll(host);
  });

  test("um novo convidado pode entrar depois que o primeiro saiu", async ({ browser }) => {
    const { host, guest } = await pair(browser, "WAAR");
    await guest.context().close();
    await host.waitForFunction(`${scene}.session.peerReady === false`, null, { timeout: 15_000, polling: 100 });

    const next = await open(browser, "online=join&room=WAAR");
    await host.waitForFunction(`${scene}.session.peerReady === true`, null, { timeout: 15_000, polling: 100 });
    await next.waitForFunction(`${scene}.session?.base`, null, { timeout: 15_000, polling: 100 });
    expect(await host.evaluate(`${scene}.remotePlayer.sprite.active`)).toBe(true);
    await closeAll(host, next);
  });

  test("quando o anfitrião sai, o convidado é avisado", async ({ browser }) => {
    const { host, guest } = await pair(browser, "WAAS");
    await host.context().close();
    await guest.waitForFunction(`${scene}.onlineStatus.error === true`, null, { timeout: 15_000, polling: 100 });
    expect(await statusText(guest)).toMatch(/anfitrião saiu|conexão com o outro jogador caiu/);
    await closeAll(guest);
  });

  test("game over no anfitrião leva o convidado para a tela de game over", async ({ browser }) => {
    const { host, guest } = await pair(browser, "WAAT");
    await host.evaluate(`${scene}.state.soulCount = 0`);
    await guest.waitForFunction(() => window.__game.scene.isActive("gameOver"), null, { timeout: 30_000, polling: 100 });
    await closeAll(host, guest);
  });

  test("fim de jogo no anfitrião leva o convidado aos créditos", async ({ browser }) => {
    const { host, guest } = await pair(browser, "WAAU");
    await host.evaluate(`${scene}.state.bossesDefeated = 2`);
    const door = await host.evaluate(`({ x: ${scene}.jailDoor.sprite.x, y: ${scene}.jailDoor.sprite.y })`);
    await host.evaluate(
      ({ x, y }) => {
        const sprite = window.__game.scene.getScene("game").localPlayer.sprite;
        sprite.setPosition(x - 40, y);
        sprite.setVelocity(0, 0);
      },
      door
    );
    await host.keyboard.down("ArrowRight");
    await guest.waitForFunction(() => window.__game.scene.isActive("credits"), null, { timeout: 30_000, polling: 100 });
    await host.keyboard.up("ArrowRight");
    await closeAll(host, guest);
  });

  test("versões diferentes do jogo são detectadas e o convidado é avisado", async ({ browser }) => {
    const { host, guest } = await pair(browser, "WAAV");
    // Um "hello" com outra impressão digital dos ids, como se o convidado rodasse outra versão.
    await guest.evaluate(() => {
      window.__game.scene.getScene("game").session.transport.send({ t: "hello", protocol: 1, ids: "outra-versao" });
    });
    await host.waitForFunction(`${scene}.session.peerReady === false`, null, { timeout: 15_000, polling: 100 });
    expect(await host.evaluate(`${scene}.remotePlayer.sprite.active`)).toBe(false);
    await guest.waitForFunction(`${scene}.onlineStatus.error === true`, null, { timeout: 15_000, polling: 100 });
    expect(await statusText(guest)).toContain("Versões diferentes");
    await closeAll(host, guest);
  });
});
