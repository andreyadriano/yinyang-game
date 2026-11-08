import { test, expect } from "@playwright/test";
import {
  MAX_MESSAGE_CHARS, MSG, ROOM_CODE_PATTERN, decode, encode, generateRoomCode, isGameMessage, packIntent, unpackIntent,
} from "../src/net/protocol.js";
import { LoopbackTransport } from "../src/net/Transport.js";
import { NetworkInput } from "../src/input/NetworkInput.js";
import { applyDelta, diffSnapshot, quantizeSnapshot } from "../src/net/snapshotDelta.js";
import { RoomCore, RoomRegistry } from "../src/net/RoomCore.js";
import { getRelayUrl, LOCAL_RELAY_URL } from "../src/net/config.js";
import { resolveGameMode } from "../src/core/gameMode.js";
import { hashIds } from "../src/net/protocol.js";

// Testes da base de rede: rodam no Node, sem navegador e sem servidor.

test.describe("protocolo", () => {
  test("a intenção vira um número pequeno e volta igual, para as 32 combinações", () => {
    for (let n = 0; n < 32; n++) {
      expect(packIntent(unpackIntent(n))).toBe(n);
    }
    expect(packIntent({ left: false, right: false, up: false, down: false, attack: false })).toBe(0);
    expect(unpackIntent(packIntent({ right: true, up: true }))).toEqual({
      left: false, right: true, up: true, down: false, attack: false,
    });
  });

  test("decode devolve a mensagem e recusa lixo", () => {
    expect(decode(encode({ t: "intent", n: 3 }))).toEqual({ t: "intent", n: 3 });
    for (const bad of ["", "não é json", "123", "null", "[]", '{"x":1}', '{"t":5}', undefined, null, 42]) {
      expect(decode(bad), String(bad)).toBeNull();
    }
    expect(decode(JSON.stringify({ t: "snapshot", pad: "x".repeat(MAX_MESSAGE_CHARS) }))).toBeNull();
  });

  test("só as mensagens do jogo são repassadas pela sala", () => {
    for (const t of [MSG.HELLO, MSG.INTENT, MSG.SNAPSHOT, MSG.SOUND, MSG.END]) expect(isGameMessage({ t })).toBe(true);
    for (const t of [MSG.JOINED, MSG.PEER_JOINED, MSG.PEER_LEFT, MSG.ERROR, "outra-coisa"]) {
      expect(isGameMessage({ t })).toBe(false);
    }
  });

  test("códigos de sala têm 4 letras sem I, L, O, e o gerador só produz códigos válidos", () => {
    for (let i = 0; i < 500; i++) expect(generateRoomCode()).toMatch(ROOM_CODE_PATTERN);
    expect("ABCD").toMatch(ROOM_CODE_PATTERN);
    for (const bad of ["abcd", "ABC", "ABCDE", "AB1D", "ABIO", "ABCL", "", "A B "]) {
      expect(bad).not.toMatch(ROOM_CODE_PATTERN);
    }
  });
});

test.describe("LoopbackTransport", () => {
  const collect = (transport) => {
    const received = [];
    transport.onMessage((m) => received.push(m));
    return received;
  };
  const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

  test("entrega as mensagens, em ordem, passando por JSON como numa rede de verdade", async () => {
    const [a, b] = LoopbackTransport.pair();
    const received = collect(b);
    const original = { t: "intent", n: 1, extra: { deep: [1, 2] } };
    a.send(original);
    a.send({ t: "intent", n: 2 });
    a.send({ t: "intent", n: 3 });
    await tick();
    expect(received.map((m) => m.n)).toEqual([1, 2, 3]);
    expect(received[0]).toEqual(original);
    expect(received[0]).not.toBe(original); // é uma cópia
  });

  test("funciona nos dois sentidos e uma ponta não recebe o que ela mesma enviou", async () => {
    const [a, b] = LoopbackTransport.pair();
    const atA = collect(a);
    const atB = collect(b);
    a.send({ t: "hello" });
    b.send({ t: "sound", name: "jump" });
    await tick();
    expect(atA).toEqual([{ t: "sound", name: "jump" }]);
    expect(atB).toEqual([{ t: "hello" }]);
  });

  test("simula atraso: a mensagem só chega depois do tempo combinado", async () => {
    const [a, b] = LoopbackTransport.pair({ latencyMs: 60 });
    const received = collect(b);
    a.send({ t: "hello" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(received).toHaveLength(0);
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(received).toHaveLength(1);
  });

  test("simula perda de mensagens", async () => {
    const [a, b] = LoopbackTransport.pair({ lossRate: 1 });
    const received = collect(b);
    for (let i = 0; i < 10; i++) a.send({ t: "intent", n: i });
    await tick();
    expect(received).toHaveLength(0);
  });

  test("fechar avisa as duas pontas e para a entrega", async () => {
    const [a, b] = LoopbackTransport.pair();
    const received = collect(b);
    let closedA = 0;
    let closedB = 0;
    a.onClose(() => closedA++);
    b.onClose(() => closedB++);
    a.close();
    a.send({ t: "hello" });
    await tick();
    expect([closedA, closedB]).toEqual([1, 1]);
    expect(received).toHaveLength(0);
  });

  test("quem ouve pode parar de ouvir", async () => {
    const [a, b] = LoopbackTransport.pair();
    const received = [];
    const stop = b.onMessage((m) => received.push(m));
    a.send({ t: "hello" });
    await tick();
    stop();
    a.send({ t: "hello" });
    await tick();
    expect(received).toHaveLength(1);
  });
});

test.describe("NetworkInput", () => {
  test("repete a última intenção recebida e dá uma cópia a cada leitura", () => {
    const input = new NetworkInput();
    expect(input.read()).toEqual({ left: false, right: false, up: false, down: false, attack: false });
    input.set({ left: false, right: true, up: true, down: false, attack: false });
    const read = input.read();
    expect(read.right && read.up).toBe(true);
    read.right = false;
    expect(input.read().right).toBe(true);
    input.clear();
    expect(input.read().up).toBe(false);
  });
});

// Um snapshot parecido com o do jogo: 3 jogadores e inimigos, a maior parte parada ou patrulhando.
function fakeSnapshot(tick, moving = {}) {
  const entities = {};
  const sprite = (x, y, extra = {}) => ({
    x, y, vx: 0, vy: 0, flipX: false, active: true, visible: true, bodyEnabled: true,
    anim: "idle", progress: 0, tinted: false, ...extra,
  });
  for (let i = 0; i < 17; i++) entities[`slime-${i}`] = sprite(400 + i * 100, 350, { health: 20, state: "free", facing: "left" });
  for (let i = 0; i < 12; i++) entities[`skeleton-${i}`] = sprite(300 + i * 90, 600, { health: 50, state: "free", facing: "right" });
  for (let i = 0; i < 34; i++) entities[`flamethrower-${i}`] = sprite(100 + i * 50, 900);
  for (let i = 0; i < 12; i++) entities[`jumper-${i}`] = sprite(200 + i * 70, 1200);
  entities["player-yin"] = sprite(100, 350, { facing: "right", state: "free", attackCombo: 0 });
  for (const [id, change] of Object.entries(moving)) entities[id] = { ...entities[id], ...change };
  return { version: 1, tick, game: { soulCount: 190, bossesDefeated: 0, keys: { yellow: false, blue: false }, isGameOver: false, isEndgame: false }, entities };
}

test.describe("snapshotDelta", () => {
  test("arredonda posições e velocidades, e não mexe no resto", () => {
    const snap = fakeSnapshot(1, { "player-yin": { x: 123.456789, y: 9.87654, vx: 299.6, vy: -350.2, progress: 0.123456 } });
    const q = quantizeSnapshot(snap).entities["player-yin"];
    expect(q).toMatchObject({ x: 123.5, y: 9.9, vx: 300, vy: -350, progress: 0.12, anim: "idle", active: true });
  });

  test("o primeiro envio é completo", () => {
    const delta = diffSnapshot(null, fakeSnapshot(1));
    expect(delta.full).toBe(true);
    expect(Object.keys(delta.entities)).toHaveLength(76);
  });

  test("depois só vai o que mudou, e só os campos que mudaram", () => {
    const before = fakeSnapshot(1);
    const after = fakeSnapshot(4, { "player-yin": { x: 112.5, vx: 300 }, "slime-3": { health: 19 } });
    const delta = diffSnapshot(before, after);
    expect(delta.full).toBe(false);
    expect(delta.entities).toEqual({ "player-yin": { x: 112.5, vx: 300 }, "slime-3": { health: 19 } });
    expect(delta.game).toBeUndefined();
  });

  test("o ponto da animação só vai quando a animação troca (senão mudaria a cada quadro)", () => {
    const before = fakeSnapshot(1);
    const sameAnim = fakeSnapshot(4, { "slime-0": { progress: 0.5, x: 401 } });
    expect(diffSnapshot(before, sameAnim).entities).toEqual({ "slime-0": { x: 401 } });

    const newAnim = fakeSnapshot(7, { "slime-0": { anim: "slime-attack", progress: 0.2 } });
    expect(diffSnapshot(before, newAnim).entities).toEqual({ "slime-0": { anim: "slime-attack", progress: 0.2 } });
  });

  test("o estado do jogo só vai quando muda", () => {
    const before = fakeSnapshot(1);
    const after = fakeSnapshot(2);
    after.game.soulCount = 185;
    expect(diffSnapshot(before, after).game.soulCount).toBe(185);
  });

  test("aplicar o delta na base reconstrói exatamente o snapshot novo", () => {
    let base = quantizeSnapshot(fakeSnapshot(0));
    let sent = null;
    let receiver = null;
    for (let step = 1; step <= 40; step++) {
      const next = quantizeSnapshot(
        fakeSnapshot(step * 3, {
          "player-yin": { x: 100 + step * 5.55, y: 350 - (step % 7) * 3.31, vx: step % 2 ? 300 : 0, anim: step % 5 ? "run" : "idle" },
          [`slime-${step % 17}`]: { x: 400 + step * 1.234, health: 20 - (step % 4) },
        })
      );
      if (step === 20) next.game.soulCount = 150;
      const delta = JSON.parse(JSON.stringify(diffSnapshot(sent, next))); // passa pela rede
      receiver = applyDelta(receiver, delta);
      // Tudo igual, exceto o ponto da animação, que de propósito só acompanha quando a animação troca.
      const withoutProgress = (snapshot) =>
        Object.fromEntries(
          Object.entries(snapshot.entities).map(([id, { progress, ...rest }]) => [id, rest])
        );
      expect(withoutProgress(receiver)).toEqual(withoutProgress(next));
      expect(receiver.game).toEqual(next.game);
      sent = next;
      base = next;
    }
  });

  test("um envio completo no meio da partida troca tudo (ressincroniza)", () => {
    const stale = quantizeSnapshot(fakeSnapshot(1, { "slime-0": { x: 1 } }));
    const fresh = quantizeSnapshot(fakeSnapshot(50, { "slime-0": { x: 999 } }));
    expect(applyDelta(stale, diffSnapshot(null, fresh))).toEqual(fresh);
  });

  test("o envio de um quadro típico é mais de 20 vezes menor que o snapshot completo", () => {
    const before = quantizeSnapshot(fakeSnapshot(1));
    const after = quantizeSnapshot(
      fakeSnapshot(4, {
        "player-yin": { x: 104.5, vx: 300 },
        "slime-2": { x: 603.3 },
        "skeleton-5": { x: 749.9 },
      })
    );
    const full = JSON.stringify(diffSnapshot(null, after)).length;
    const small = JSON.stringify(diffSnapshot(before, after)).length;
    console.log(`completo: ${full} bytes, delta: ${small} bytes`);
    expect(small).toBeLessThan(full / 20);
  });
});

test.describe("salas", () => {
  const fakePeer = (name) => {
    const peer = { name, sent: [], closed: null };
    peer.send = (text) => peer.sent.push(decode(text));
    peer.close = (code, reason) => (peer.closed = { code, reason });
    return peer;
  };
  const types = (peer) => peer.sent.map((m) => m.t);

  test("o primeiro a entrar é o anfitrião, o segundo o convidado, e o anfitrião é avisado", () => {
    const room = new RoomCore("ABCD");
    const host = fakePeer("host");
    const guest = fakePeer("guest");
    expect(room.join(host)).toBe("host");
    expect(room.join(guest)).toBe("guest");
    expect(host.sent).toEqual([{ t: "joined", role: "host", room: "ABCD" }, { t: "peer-joined" }]);
    expect(guest.sent).toEqual([{ t: "joined", role: "guest", room: "ABCD" }]);
  });

  test("um terceiro é recusado e a sala não muda", () => {
    const room = new RoomCore("ABCD");
    const [host, guest, third] = ["a", "b", "c"].map(fakePeer);
    room.join(host);
    room.join(guest);
    expect(room.join(third)).toBeNull();
    expect(third.sent).toEqual([{ t: "error", code: "room-full" }]);
    expect(third.closed.code).toBe(1008);
    expect(room.host).toBe(host);
    expect(room.guest).toBe(guest);
  });

  test("mensagens do jogo vão para o outro lado e nunca voltam para quem enviou", () => {
    const room = new RoomCore("ABCD");
    const [host, guest] = ["h", "g"].map(fakePeer);
    room.join(host);
    room.join(guest);
    host.sent.length = guest.sent.length = 0;

    room.receive(guest, encode({ t: "intent", n: 2 }));
    room.receive(host, encode({ t: "snapshot", full: true, tick: 1, game: {}, entities: {} }));
    expect(types(host)).toEqual(["intent"]);
    expect(types(guest)).toEqual(["snapshot"]);
  });

  test("mensagens inválidas ou que não são do jogo não são repassadas", () => {
    const room = new RoomCore("ABCD");
    const [host, guest] = ["h", "g"].map(fakePeer);
    room.join(host);
    room.join(guest);
    guest.sent.length = host.sent.length = 0;

    room.receive(host, "lixo");
    room.receive(host, encode({ t: "joined", role: "host" })); // finge ser do servidor
    room.receive(host, encode({ t: "snapshot", pad: "x".repeat(MAX_MESSAGE_CHARS) }));
    expect(guest.sent).toEqual([]);
    expect(host.sent.map((m) => m.code)).toEqual(["bad-message", "bad-message", "bad-message"]);
  });

  test("sem outro jogador na sala, as mensagens se perdem sem erro", () => {
    const room = new RoomCore("ABCD");
    const host = fakePeer("h");
    room.join(host);
    host.sent.length = 0;
    expect(() => room.receive(host, encode({ t: "snapshot", full: true, tick: 1, game: {}, entities: {} }))).not.toThrow();
    expect(host.sent).toEqual([]);
  });

  test("quando o convidado sai o anfitrião é avisado e a vaga reabre", () => {
    const room = new RoomCore("ABCD");
    const [host, guest, next] = ["h", "g", "n"].map(fakePeer);
    room.join(host);
    room.join(guest);
    host.sent.length = 0;
    room.leave(guest);
    expect(host.sent).toEqual([{ t: "peer-left" }]);
    expect(room.join(next)).toBe("guest");
  });

  test("quando o anfitrião sai o convidado é avisado e desconectado", () => {
    const room = new RoomCore("ABCD");
    const [host, guest] = ["h", "g"].map(fakePeer);
    room.join(host);
    room.join(guest);
    guest.sent.length = 0;
    room.leave(host);
    expect(guest.sent).toEqual([{ t: "peer-left" }]);
    expect(guest.closed).toEqual({ code: 1000, reason: "host-left" });
    expect(room.isEmpty()).toBe(true);
  });

  test("o registro cria a sala na primeira entrada, recusa códigos ruins e apaga salas vazias", () => {
    const registry = new RoomRegistry();
    const [a, b] = ["a", "b"].map(fakePeer);

    const bad = registry.join("abc", a);
    expect(bad).toBeNull();
    expect(a.sent).toEqual([{ t: "error", code: "bad-room" }]);
    expect(registry.rooms.size).toBe(0);

    const first = registry.join("WXYZ", a);
    const second = registry.join("WXYZ", b);
    expect(first.role).toBe("host");
    expect(second.role).toBe("guest");
    expect(second.room).toBe(first.room);
    expect(registry.rooms.size).toBe(1);

    registry.leave(second.room, b);
    expect(registry.rooms.size).toBe(1);
    registry.leave(first.room, a);
    expect(registry.rooms.size).toBe(0);
  });
});

test.describe("modos de jogo online", () => {
  test("?online=host cria uma sala e joga de Yin; o código se mantém ao reiniciar", () => {
    const first = resolveGameMode("?online=host", false, "localhost");
    const again = resolveGameMode("?online=host", false, "localhost");
    expect(first).toMatchObject({
      name: "online",
      camera: "single",
      localCharacter: "yin",
      characters: ["yin", "yang"],
      online: { role: "host", relayUrl: LOCAL_RELAY_URL },
    });
    expect(first.online.room).toMatch(ROOM_CODE_PATTERN);
    expect(again.online.room).toBe(first.online.room);
  });

  test("?room= escolhe o código (em maiúsculas) e ?online=join joga de Yang", () => {
    const host = resolveGameMode("?online=host&room=wxyz", false, "localhost");
    const guest = resolveGameMode("?online=join&room=wxyz", false, "localhost");
    expect(host.online.room).toBe("WXYZ");
    expect(guest).toMatchObject({ localCharacter: "yang", online: { role: "guest", room: "WXYZ" } });
  });

  test("entrar sem código de sala deixa o código vazio (a conexão acusa o erro)", () => {
    expect(resolveGameMode("?online=join", false, "localhost").online.room).toBe("");
  });

  test("o toque continua valendo online, para os botões na tela", () => {
    expect(resolveGameMode("?online=join&room=ABCD", true, "localhost").touch).toBe(true);
    expect(resolveGameMode("?online=join&room=ABCD", false, "localhost").touch).toBe(false);
  });

  test("sem ?online, os modos de antes não mudam", () => {
    expect(resolveGameMode("", false, "localhost")).toMatchObject({ name: "local", characters: ["yin", "yang"], camera: "split" });
    expect(resolveGameMode("", true, "localhost")).toMatchObject({ name: "solo", characters: ["yin"], camera: "single" });
    expect(resolveGameMode("?online=outro", false, "localhost").name).toBe("local");
  });

  test("o servidor de repasse: local em localhost, configurável por ?relay=, e ausente se não houver", () => {
    expect(getRelayUrl("", "localhost")).toBe(LOCAL_RELAY_URL);
    expect(getRelayUrl("", "127.0.0.1")).toBe(LOCAL_RELAY_URL);
    expect(getRelayUrl("?relay=wss://exemplo.dev", "meujogo.com")).toBe("wss://exemplo.dev");
    expect(getRelayUrl("", "meujogo.com")).toBeNull(); // ainda não há servidor de produção
  });

  test("a impressão digital dos ids muda quando os ids mudam", () => {
    const ids = ["slime-0", "slime-1", "player-yin"];
    expect(hashIds(ids)).toBe(hashIds([...ids]));
    expect(hashIds(ids)).not.toBe(hashIds(["slime-0", "slime-1"]));
    expect(hashIds(ids)).not.toBe(hashIds(["slime-1", "slime-0", "player-yin"]));
  });
});
