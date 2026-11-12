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
    const host = await open(browser, "online=host&room=XXWAAA");
    await host.waitForFunction(`${scene}.session !== undefined`, null, { timeout: 15_000 });

    // Sozinho: a sala existe, o outro personagem está escondido e não conta para os inimigos.
    expect(await host.evaluate(`${scene}.remotePlayer.sprite.active`)).toBe(false);
    expect(await statusText(host)).toContain("Sala XXWAAA");
    expect(await statusText(host)).toContain("toque para enviar o link");

    const guest = await open(browser, "online=join&room=XXWAAA");
    await host.waitForFunction(`${scene}.session.peerReady === true`, null, { timeout: 15_000, polling: 100 });
    expect(await host.evaluate(`${scene}.remotePlayer.sprite.active`)).toBe(true);
    expect(await host.evaluate(`${scene}.remotePlayer.character`)).toBe("yang");
    expect(await statusText(host)).toContain("amigo conectado");
    expect(await statusText(guest)).toContain("conectado");

    expect([...(host.errors), ...(guest.errors)]).toEqual([]);
    await closeAll(host, guest);
  });

  test("o link de convite leva o código da sala e o servidor escolhido, e só ele", async ({ browser }) => {
    const withRelay = await open(browser, "online=host&room=XXKM22&relay=ws://localhost:8787");
    const link = new URL(await withRelay.evaluate(`${scene}.onlineStatus.inviteLink()`));
    expect(link.searchParams.get("online")).toBe("join");
    expect(link.searchParams.get("room")).toBe("XXKM22");
    expect(link.searchParams.get("relay")).toBe("ws://localhost:8787");
    await closeAll(withRelay);

    // Sem ?relay= na página, o link não inventa um (o convidado usa o servidor padrão).
    const plain = await open(browser, "online=host&room=XXKN22");
    const plainLink = new URL(await plain.evaluate(`${scene}.onlineStatus.inviteLink()`));
    expect([...plainLink.searchParams.keys()].sort()).toEqual(["online", "room"]);
    await closeAll(plain);
  });

  test("o anfitrião joga de Yin e o convidado de Yang", async ({ browser }) => {
    const { host, guest } = await pair(browser, "XXWAAB");
    const roles = (page) => page.evaluate(`({ local: ${scene}.localPlayer.character, remote: ${scene}.remotePlayer.character, cameras: ${scene}.cameras.cameras.length })`);
    expect(await roles(host)).toEqual({ local: "yin", remote: "yang", cameras: 1 });
    expect(await roles(guest)).toEqual({ local: "yang", remote: "yin", cameras: 1 });
    await closeAll(host, guest);
  });

  test("entrar numa sala que não existe mostra o erro e volta para a tela inicial ao tocar", async ({ browser }) => {
    const guest = await open(browser, "online=join&room=XXWZZZ");
    await guest.waitForFunction(`${scene}.onlineStatus.error === true`, null, { timeout: 15_000 });
    expect(await statusText(guest)).toContain("Essa sala não existe");
    expect(await guest.evaluate(`${scene}.session === undefined`)).toBe(true);
    await guest.evaluate(`${scene}.onlineStatus.text.emit("pointerup")`);
    await guest.waitForFunction(() => window.__game.scene.isActive("start"), null, { timeout: 10_000 });
    await closeAll(guest);
  });

  test("criar uma sala que já existe é recusado", async ({ browser }) => {
    const first = await open(browser, "online=host&room=XXWAAC");
    await first.waitForFunction(`${scene}.session !== undefined`, null, { timeout: 15_000 });
    const second = await open(browser, "online=host&room=XXWAAC");
    await second.waitForFunction(`${scene}.onlineStatus.error === true`, null, { timeout: 15_000 });
    expect(await statusText(second)).toContain("já está em uso");
    await closeAll(first, second);
  });

  test("um terceiro jogador é recusado com a sala cheia", async ({ browser }) => {
    const { host, guest } = await pair(browser, "XXWAAD");
    const third = await open(browser, "online=join&room=XXWAAD");
    await third.waitForFunction(`${scene}.onlineStatus.error === true`, null, { timeout: 15_000 });
    expect(await statusText(third)).toContain("dois jogadores");
    // E a partida dos dois continua.
    expect(await host.evaluate(`${scene}.session.peerReady`)).toBe(true);
    await closeAll(host, guest, third);
  });

  test("sem servidor configurado, o modo online avisa em vez de travar", async ({ browser }) => {
    const page = await open(browser, "online=host&room=XXWAAE&relay=ws://localhost:1");
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
    const { host, guest } = await pair(browser, "XXWAAF");
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
    const { host, guest } = await pair(browser, "XXWAAG");
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
    const { host, guest } = await pair(browser, "XXWAAH");
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
    const { host, guest } = await pair(browser, "XXWAAJ");
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
    const { host, guest } = await pair(browser, "XXWAAK");
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
    const { host, guest } = await pair(browser, "XXWAAW");
    await host.evaluate(`${scene}.slimes[1].health = 0`);
    await guest.waitForFunction(`${scene}.slimes[1].sprite.active === false`, null, { timeout: 15_000, polling: 100 });
    await closeAll(host, guest);
  });

  test("a vida (HUD) do convidado acompanha a do anfitrião", async ({ browser }) => {
    const { host, guest } = await pair(browser, "XXWAAM");
    await host.evaluate(`${scene}.state.loseSoul(40, "teste")`);
    await guest.waitForFunction(`${scene}.state.soulCount === 150`, null, { timeout: 10_000, polling: 100 });
    await closeAll(host, guest);
  });

  test("os inimigos do anfitrião atacam o Yang do convidado, e ele sente o golpe", async ({ browser }) => {
    const { host, guest } = await pair(browser, "XXWAAN");
    const slimeX = await host.evaluate(`${scene}.slimes[0].sprite.x`);
    // O convidado manda na posição do próprio personagem: é ele quem se teleporta.
    await guest.evaluate(
      (x) => {
        const yang = window.__game.scene.getScene("game").localPlayer.sprite;
        yang.body.reset(x + 25, 350);
      },
      slimeX
    );
    await host.waitForFunction(`${scene}.state.soulCount < 190`, null, { timeout: 15_000, polling: 100 });
    await guest.waitForFunction(`${scene}.state.soulCount < 190`, null, { timeout: 15_000, polling: 100 });
    // O golpe decidido no anfitrião chega ao Yang do convidado (animação de dor).
    await guest.waitForFunction(`${scene}.localPlayer.state === "hurt"`, null, { timeout: 5_000, polling: 20 });
    await closeAll(host, guest);
  });

  test("o convidado se move na hora, sem esperar o anfitrião", async ({ browser }) => {
    const { host, guest } = await pair(browser, "XXWAAX");
    await guest.waitForFunction(() => window.__game.loop.frame > 220, null, { timeout: 30_000 }); // depois disso o tempo é real
    const yangX = (page) => page.evaluate(`${scene}.players.find((p) => p.character === "yang").sprite.x`);
    const before = await yangX(guest);

    // Atraso artificial de 600 ms na ida: antes, o convidado só se mexia depois disso (e mais a volta).
    // (O Chrome sem GPU roda a ~12 quadros por segundo, então a janela precisa ser folgada.)
    await guest.evaluate(() => {
      const transport = window.__game.scene.getScene("game").session.transport;
      const send = transport.send.bind(transport);
      transport.send = (message) => setTimeout(() => send(message), 600);
    });
    await guest.keyboard.down("ArrowRight");
    await guest.waitForFunction(`${scene}.players.find((p) => p.character === "yang").sprite.x > ${before + 15}`, null, {
      timeout: 450,
      polling: 16,
    });
    await guest.keyboard.up("ArrowRight");
    await closeAll(host, guest);
  });

  test("o anfitrião vê o Yang no mesmo lugar em que o convidado o deixou", async ({ browser }) => {
    const { host, guest } = await pair(browser, "XXWAAY");
    await guest.waitForFunction(() => window.__game.loop.frame > 220, null, { timeout: 30_000 });
    await guest.keyboard.down("ArrowRight");
    await guest.waitForTimeout(1200);
    await guest.keyboard.up("ArrowRight");
    await guest.waitForTimeout(800);
    await host.waitForTimeout(300);
    const yang = (page) => page.evaluate(`(() => { const s = ${scene}.players.find((p) => p.character === "yang").sprite; return [s.x, s.y]; })()`);
    const [h, g] = [await yang(host), await yang(guest)];
    expect(Math.abs(h[0] - g[0])).toBeLessThan(12);
    expect(Math.abs(h[1] - g[1])).toBeLessThan(12);
    expect(g[0]).toBeGreaterThan(150); // andou de verdade (saiu do ponto de partida, x = 75)
    await closeAll(host, guest);
  });

  test("um portal tocado pelo Yang leva o convidado ao destino", async ({ browser }) => {
    const { host, guest } = await pair(browser, "XXWAAZ");
    const portal = await host.evaluate(`({ x: ${scene}.portals[0].sprite.x, y: ${scene}.portals[0].sprite.y, dx: ${scene}.portals[0].destinationX, dy: ${scene}.portals[0].destinationY })`);
    await guest.evaluate(({ x, y }) => window.__game.scene.getScene("game").localPlayer.sprite.body.reset(x, y), portal);
    await guest.waitForFunction(
      ({ dx, dy }) => {
        const s = window.__game.scene.getScene("game").localPlayer.sprite;
        return Math.abs(s.x - dx) < 80 && Math.abs(s.y - dy) < 120;
      },
      portal,
      { timeout: 10_000, polling: 50 }
    );
    await closeAll(host, guest);
  });

  test("o som do pulo do convidado toca uma vez só no aparelho dele", async ({ browser }) => {
    const { host, guest } = await pair(browser, "XXWAAA".replace("AAA", "BBA"));
    await guest.waitForTimeout(800);
    await guest.evaluate(() => {
      const audio = window.__game.scene.getScene("game").audio;
      window.__jumps = 0;
      for (const method of ["play", "playQuiet"]) {
        const original = audio[method].bind(audio);
        audio[method] = (name, config) => {
          if (name === "jump") window.__jumps++;
          original(name, config);
        };
      }
    });
    await guest.keyboard.down("ArrowUp");
    await guest.waitForTimeout(150);
    await guest.keyboard.up("ArrowUp");
    await guest.waitForTimeout(1200);
    expect(await guest.evaluate(() => window.__jumps)).toBe(1);
    await closeAll(host, guest);
  });
});

test.describe("rede", () => {
  test("o fluxo de dados cabe numa rede de celular", async ({ browser }) => {
    const { host, guest } = await pair(browser, "XXWAAP");
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
    expect(snapshotsPerSecond).toBeGreaterThan(5);
    expect(snapshotsPerSecond).toBeLessThan(12);
    expect(bytesPerSecond).toBeLessThan(40_000);
    await closeAll(host, guest);
  });
});

test.describe("economia de mensagens", () => {
  test("o convidado roda o ciclo dos lança-chamas sozinho, sem receber as trocas de animação", async ({ browser }) => {
    const { host, guest } = await pair(browser, "XXWABB");
    await guest.evaluate(() => {
      const socket = window.__game.scene.getScene("game").session.transport.socket;
      window.__flameAnimMessages = 0;
      window.__seenAnims = new Set();
      socket.addEventListener("message", (event) => {
        const message = JSON.parse(event.data);
        if (message.t !== "snapshot" || message.full) return;
        for (const [id, changes] of Object.entries(message.entities)) {
          if (id.startsWith("flamethrower") && changes.anim !== undefined) window.__flameAnimMessages++;
        }
      });
      const scene = window.__game.scene.getScene("game");
      setInterval(() => scene.flamethrowers.forEach((f) => window.__seenAnims.add(f.sprite.anims.getName())), 50);
    });
    await guest.waitForTimeout(10_000);
    // Nenhum snapshot incremental trouxe animação de lança-chamas, e mesmo assim o ciclo andou no convidado.
    expect(await guest.evaluate(() => window.__flameAnimMessages)).toBe(0);
    expect(await guest.evaluate(() => [...window.__seenAnims].filter((name) => name).length)).toBeGreaterThanOrEqual(2);
    await closeAll(host, guest);
  });

  test("com tudo parado, o anfitrião e o convidado quase não mandam mensagens", async ({ browser }) => {
    const { host, guest } = await pair(browser, "XXWABA");
    // Sem inimigos, ninguém se mexe. Os lança-chamas ciclam sozinhos, mas o convidado roda o mesmo
    // ciclo, então eles também não custam mensagens.
    await host.evaluate(() => {
      const game = window.__game.scene.getScene("game");
      for (const enemy of [...game.slimes, ...game.skeletons, ...game.demons]) enemy.sprite.disableBody(true, true);
    });
    await guest.waitForTimeout(1500); // o jogo se acalma (a queda e a última mudança chegam)
    await guest.evaluate(() => {
      const socket = window.__game.scene.getScene("game").session.transport.socket;
      window.__messages = 0;
      socket.addEventListener("message", () => window.__messages++);
    });
    await guest.waitForTimeout(3000);
    // Só pode chegar o quadro completo de 5 em 5 s (e, no máximo, um outro que o jogo ainda precise).
    expect(await guest.evaluate(() => window.__messages)).toBeLessThanOrEqual(3);
    await closeAll(host, guest);
  });
});

test.describe("saídas", () => {
  test("quando o convidado sai, o Yang some do anfitrião e deixa de ser alvo", async ({ browser }) => {
    const { host, guest } = await pair(browser, "XXWAAQ");
    await guest.context().close();
    await host.waitForFunction(`${scene}.session.peerReady === false`, null, { timeout: 15_000, polling: 100 });
    expect(await host.evaluate(`${scene}.remotePlayer.sprite.active`)).toBe(false);
    expect(await statusText(host)).toContain("toque para enviar o link");
    expect(await host.evaluate(`${scene}.slimes[0].activePlayers().map((p) => p.character)`)).toEqual(["yin"]);
    await closeAll(host);
  });

  test("um novo convidado pode entrar depois que o primeiro saiu", async ({ browser }) => {
    const { host, guest } = await pair(browser, "XXWAAR");
    await guest.context().close();
    await host.waitForFunction(`${scene}.session.peerReady === false`, null, { timeout: 15_000, polling: 100 });

    const next = await open(browser, "online=join&room=XXWAAR");
    await host.waitForFunction(`${scene}.session.peerReady === true`, null, { timeout: 15_000, polling: 100 });
    await next.waitForFunction(`${scene}.session?.base`, null, { timeout: 15_000, polling: 100 });
    expect(await host.evaluate(`${scene}.remotePlayer.sprite.active`)).toBe(true);
    await closeAll(host, next);
  });

  test("quando o anfitrião sai, o convidado é avisado", async ({ browser }) => {
    const { host, guest } = await pair(browser, "XXWAAS");
    await host.context().close();
    await guest.waitForFunction(`${scene}.onlineStatus.error === true`, null, { timeout: 15_000, polling: 100 });
    expect(await statusText(guest)).toMatch(/anfitrião saiu|conexão com o outro jogador caiu/);
    await closeAll(guest);
  });

  test("game over no anfitrião leva o convidado para a tela de game over", async ({ browser }) => {
    const { host, guest } = await pair(browser, "XXWAAT");
    await host.evaluate(`${scene}.state.soulCount = 0`);
    await guest.waitForFunction(() => window.__game.scene.isActive("gameOver"), null, { timeout: 30_000, polling: 100 });
    await closeAll(host, guest);
  });

  test("fim de jogo no anfitrião leva o convidado aos créditos", async ({ browser }) => {
    const { host, guest } = await pair(browser, "XXWAAU");
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
    const { host, guest } = await pair(browser, "XXWAAV");
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
