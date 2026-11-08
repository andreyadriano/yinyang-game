import { test, expect } from "@playwright/test";
import { KeyedRateLimiter, TokenBucket } from "../src/net/RateLimiter.js";
import { RoomCore, RoomRegistry } from "../src/net/RoomCore.js";
import { MAX_MESSAGE_CHARS, decode, encode } from "../src/net/protocol.js";
import { clientKey, originAllowed, resetConnectLimiter, screenRequest } from "../worker/src/guards.js";

// Testes das defesas contra abuso (sem navegador e sem servidor): limite de mensagens, desconexão de
// quem manda lixo, papéis das salas, e as recusas baratas do Worker.

// Um relógio que só anda quando mandamos.
const clock = (start = 1_000_000) => {
  let now = start;
  const fn = () => now;
  fn.advance = (ms) => (now += ms);
  return fn;
};

test.describe("TokenBucket", () => {
  test("deixa passar uma rajada até a capacidade e depois recusa", () => {
    const now = clock();
    const bucket = new TokenBucket({ capacity: 5, refillPerSecond: 1, now });
    const results = Array.from({ length: 8 }, () => bucket.take());
    expect(results).toEqual([true, true, true, true, true, false, false, false]);
  });

  test("recarrega com o tempo, sem passar da capacidade", () => {
    const now = clock();
    const bucket = new TokenBucket({ capacity: 3, refillPerSecond: 2, now });
    for (let i = 0; i < 3; i++) bucket.take();
    expect(bucket.take()).toBe(false);
    now.advance(500); // +1 ficha
    expect(bucket.take()).toBe(true);
    expect(bucket.take()).toBe(false);
    now.advance(60_000); // muito tempo: enche, mas só até 3
    expect([bucket.take(), bucket.take(), bucket.take(), bucket.take()]).toEqual([true, true, true, false]);
  });

  test("a taxa média nunca passa da recarga", () => {
    const now = clock();
    const bucket = new TokenBucket({ capacity: 10, refillPerSecond: 20, now });
    let allowed = 0;
    for (let ms = 0; ms < 10_000; ms += 10) {
      now.advance(10);
      if (bucket.take()) allowed++; // tenta 100 por segundo
    }
    expect(allowed).toBeLessThanOrEqual(10 + 20 * 10 + 1);
    expect(allowed).toBeGreaterThan(190);
  });
});

test.describe("KeyedRateLimiter", () => {
  test("cada chave tem o seu próprio balde", () => {
    const limiter = new KeyedRateLimiter({ capacity: 2, refillPerSecond: 0, now: clock() });
    expect([limiter.allow("a"), limiter.allow("a"), limiter.allow("a")]).toEqual([true, true, false]);
    expect(limiter.allow("b")).toBe(true);
  });

  test("a memória não cresce além do máximo de chaves, esquecendo as menos usadas", () => {
    const limiter = new KeyedRateLimiter({ capacity: 1, refillPerSecond: 0, maxKeys: 100, now: clock() });
    for (let i = 0; i < 10_000; i++) limiter.allow(`ip-${i}`);
    expect(limiter.buckets.size).toBe(100);
    // Quem foi esquecido volta com o balde cheio; quem é recente continua limitado.
    expect(limiter.allow("ip-0")).toBe(true);
    expect(limiter.allow("ip-9999")).toBe(false);
  });
});

function fakePeer(name) {
  const peer = { name, sent: [], closed: null, closedNow: null };
  peer.send = (text) => peer.sent.push(decode(text));
  peer.close = (code, reason) => (peer.closed = { code, reason });
  peer.closeNow = (code, reason) => (peer.closedNow = { code, reason });
  return peer;
}
const codes = (peer) => peer.sent.filter((m) => m.t === "error").map((m) => m.code);

function pair(options) {
  const now = clock();
  const room = new RoomCore("XXABCD", { now, ...options });
  const host = fakePeer("host");
  const guest = fakePeer("guest");
  room.join(host);
  room.join(guest);
  host.sent.length = guest.sent.length = 0;
  return { room, host, guest, now };
}

test.describe("papéis pedidos", () => {
  test("pedir para ser convidado de uma sala sem anfitrião é recusado e não cria sala", () => {
    const registry = new RoomRegistry();
    const peer = fakePeer("g");
    expect(registry.join("XXABCD", peer, "guest")).toBeNull();
    expect(peer.sent).toEqual([{ t: "error", code: "room-not-found" }]);
    expect(peer.closed.code).toBe(1008);
    expect(registry.rooms.size).toBe(0);
  });

  test("pedir para ser anfitrião de uma sala que já tem anfitrião é recusado", () => {
    const registry = new RoomRegistry();
    registry.join("XXABCD", fakePeer("h"), "host");
    const second = fakePeer("h2");
    expect(registry.join("XXABCD", second, "host")).toBeNull();
    expect(second.sent).toEqual([{ t: "error", code: "room-in-use" }]);
    expect(registry.rooms.get("XXABCD").host.name).toBe("h"); // a sala original não mudou
  });

  test("convidado de uma sala com anfitrião entra normalmente", () => {
    const registry = new RoomRegistry();
    registry.join("XXABCD", fakePeer("h"), "host");
    const guest = fakePeer("g");
    expect(registry.join("XXABCD", guest, "guest").role).toBe("guest");
  });

  test("sem pedir papel, o primeiro é anfitrião (compatível com antes)", () => {
    const registry = new RoomRegistry();
    expect(registry.join("XXABCD", fakePeer("a")).role).toBe("host");
    expect(registry.join("XXABCD", fakePeer("b")).role).toBe("guest");
  });
});

test.describe("limite de mensagens por conexão", () => {
  test("o uso normal do jogo passa sem problema (30 mensagens por segundo por 10 segundos)", () => {
    const { room, host, guest, now } = pair();
    for (let i = 0; i < 300; i++) {
      now.advance(1000 / 30);
      room.receive(host, encode({ t: "snapshot", full: false, tick: i, entities: {} }));
    }
    expect(guest.sent).toHaveLength(300);
    expect(host.closedNow).toBeNull();
  });

  test("uma rajada curta (uma luta, todos os sons de uma vez) passa", () => {
    const { room, host, guest } = pair();
    for (let i = 0; i < 100; i++) room.receive(host, encode({ t: "sound", name: "jump" }));
    expect(guest.sent).toHaveLength(100);
    expect(host.closedNow).toBeNull();
  });

  test("uma enxurrada é cortada: o infrator é avisado e desconectado na hora", () => {
    const { room, host, guest } = pair();
    for (let i = 0; i < 1000; i++) room.receive(host, encode({ t: "intent", n: 1 }));
    expect(codes(host)).toEqual(["rate-limit"]);
    expect(host.closedNow).toEqual({ code: 1008, reason: "rate-limit" });
    // E o outro jogador é avisado na hora, sem esperar a conexão do infrator terminar de fechar.
    expect(guest.sent.filter((m) => m.t === "peer-left")).toHaveLength(1);
    expect(room.host).toBeNull();
    // O que passou antes do corte foi só a rajada permitida; o resto nem chegou ao outro jogador.
    expect(guest.sent.filter((m) => m.t === "intent").length).toBeLessThanOrEqual(150);
  });

  test("depois do corte, o que o infrator ainda mandar é ignorado (não é processado nem repassado)", () => {
    const { room, host, guest } = pair();
    for (let i = 0; i < 400; i++) room.receive(host, encode({ t: "intent", n: 1 }));
    const delivered = guest.sent.length;
    const errors = host.sent.length;
    for (let i = 0; i < 500; i++) room.receive(host, encode({ t: "intent", n: 2 }));
    expect(guest.sent).toHaveLength(delivered);
    expect(host.sent).toHaveLength(errors); // nem erro novo: só silêncio
  });

  test("o limite é por conexão: um infrator não atrapalha o outro jogador", () => {
    const { room, host, guest } = pair();
    for (let i = 0; i < 1000; i++) room.receive(guest, encode({ t: "intent", n: 1 }));
    expect(guest.closedNow).not.toBeNull();
    room.receive(host, encode({ t: "snapshot", full: false, tick: 1, entities: {} }));
    expect(host.closedNow).toBeNull();
  });

  test("quem sai e volta começa com o balde cheio", () => {
    const { room, host } = pair();
    for (let i = 0; i < 1000; i++) room.receive(host, encode({ t: "intent", n: 1 }));
    room.leave(host);
    const again = fakePeer("again");
    room.join(again);
    room.receive(again, encode({ t: "intent", n: 1 }));
    expect(again.closedNow).toBeNull();
  });
});

test.describe("expulsar", () => {
  test("a sala é liberada na hora e quem foi expulso pode ser substituído", () => {
    const { room, host, guest } = pair();
    room.expel(guest, "room-timeout", 1000);
    expect(guest.closedNow).toEqual({ code: 1000, reason: "room-timeout" });
    expect(codes(guest)).toEqual(["room-timeout"]);
    expect(host.sent.filter((m) => m.t === "peer-left")).toHaveLength(1);

    const next = fakePeer("next");
    expect(room.join(next)).toBe("guest");
  });

  test("expulsar o anfitrião avisa o convidado, e o fechamento depois não avisa de novo", () => {
    const { room, host, guest } = pair();
    room.expel(host, "room-timeout", 1000);
    expect(guest.sent.filter((m) => m.t === "peer-left")).toHaveLength(1);
    expect(guest.closed).toEqual({ code: 1000, reason: "host-left" });

    room.leave(host); // o fechamento da conexão do expulso chega depois
    expect(guest.sent.filter((m) => m.t === "peer-left")).toHaveLength(1);
  });

  test("o expulso continua ignorado até a conexão dele de fato fechar", () => {
    const { room, host, guest } = pair();
    room.expel(host, "rate-limit");
    const before = guest.sent.length;
    room.receive(host, encode({ t: "intent", n: 1 }));
    expect(guest.sent).toHaveLength(before);
    room.leave(host);
  });
});

test.describe("mensagens inválidas", () => {
  test("lixo repetido desconecta, mas um erro ou outro não", () => {
    const { room, host } = pair();
    for (let i = 0; i < 4; i++) room.receive(host, "lixo");
    expect(host.closedNow).toBeNull();
    room.receive(host, "lixo");
    expect(host.closedNow).toEqual({ code: 1008, reason: "bad-message" });
  });

  test("uma mensagem grande demais conta como inválida e nunca é repassada", () => {
    const { room, host, guest } = pair();
    room.receive(host, JSON.stringify({ t: "snapshot", pad: "x".repeat(MAX_MESSAGE_CHARS) }));
    expect(guest.sent).toEqual([]);
    expect(codes(host)).toEqual(["bad-message"]);
  });

  test("fingir ser o servidor (joined, error) é inválido", () => {
    const { room, host, guest } = pair({ maxStrikes: 2 });
    room.receive(host, encode({ t: "joined", role: "host" }));
    room.receive(host, encode({ t: "error", code: "room-full" }));
    expect(guest.sent.filter((m) => m.t !== "peer-left")).toEqual([]); // nada repassado
    expect(host.closedNow).not.toBeNull();
  });
});

test.describe("Worker: recusas baratas (guards)", () => {
  const ws = (path, headers = {}) =>
    new Request(`https://relay.example${path}`, { headers: { Upgrade: "websocket", ...headers } });
  const env = (extra = {}) => ({ ...extra });

  test.beforeEach(() => resetConnectLimiter());

  test("um código válido de sala passa", async () => {
    expect(await screenRequest(ws("/room/XXABCD"), env())).toEqual({ ok: true, code: "XXABCD" });
  });

  test("caminhos que não são de sala dão 404, e sem WebSocket dão 426", async () => {
    expect((await screenRequest(ws("/outra-coisa"), env())).response.status).toBe(404);
    expect((await screenRequest(ws("/room/XXABCD/extra"), env())).response.status).toBe(404);
    expect((await screenRequest(new Request("https://relay.example/room/XXABCD"), env())).response.status).toBe(426);
  });

  test("códigos inválidos viram um socket que explica (bad-room), sem chegar a uma sala", async () => {
    for (const bad of ["ABCD", "abcdef", "ABCDEFG", "ABC1EF", "ABCOEF"]) {
      expect(await screenRequest(ws(`/room/${bad}`), env()), bad).toEqual({ ok: false, rejectWith: "bad-room" });
    }
  });

  test("a chave geral de emergência recusa tudo com 503", async () => {
    const result = await screenRequest(ws("/room/XXABCD"), env({ ONLINE_ENABLED: "false" }));
    expect(result.response.status).toBe(503);
    expect((await screenRequest(ws("/room/XXABCD"), env({ ONLINE_ENABLED: "true" }))).ok).toBe(true);
  });

  test("muitas tentativas de um mesmo endereço levam a 429 com Retry-After, e outro endereço não é afetado", async () => {
    const e = env({ CONNECT_BURST: "3", CONNECT_PER_MINUTE: "1", CLIENT_ID_HEADER: "x-client" });
    const attempt = (id) => screenRequest(ws("/room/XXABCD", { "x-client": id }), e);
    const results = [];
    for (let i = 0; i < 6; i++) results.push((await attempt("script")).ok);
    expect(results).toEqual([true, true, true, false, false, false]);

    const refused = await attempt("script");
    expect(refused.response.status).toBe(429);
    expect(refused.response.headers.get("Retry-After")).toBe("60");

    expect((await attempt("outra-pessoa")).ok).toBe(true);
  });

  test("a chave é o endereço que a Cloudflare viu, e o cabeçalho de teste só vale se configurado", () => {
    const request = ws("/room/XXABCD", { "CF-Connecting-IP": "203.0.113.7", "x-client": "forjado" });
    expect(clientKey(request, env())).toBe("203.0.113.7"); // sem CLIENT_ID_HEADER, um cabeçalho forjado não vale
    expect(clientKey(request, env({ CLIENT_ID_HEADER: "x-client" }))).toBe("forjado");
    expect(clientKey(new Request("https://relay.example/"), env())).toBe("unknown");
  });

  test("o limitador da Cloudflare, se estiver ligado, também vale", async () => {
    const calls = [];
    const CONNECT_LIMITER = { limit: async ({ key }) => (calls.push(key), { success: calls.length <= 2 }) };
    const e = env({ CONNECT_LIMITER, CLIENT_ID_HEADER: "x-client" });
    const attempt = () => screenRequest(ws("/room/XXABCD", { "x-client": "alguem" }), e);
    expect([(await attempt()).ok, (await attempt()).ok, (await attempt()).ok]).toEqual([true, true, false]);
    expect(calls).toEqual(["alguem", "alguem", "alguem"]);
  });

  test("origens: vazio aceita qualquer uma; preenchido só aceita as listadas", () => {
    const withOrigin = (origin) => ws("/room/XXABCD", origin ? { Origin: origin } : {});
    expect(originAllowed(withOrigin("https://qualquer.com"), env())).toBe(true);
    const e = env({ ALLOWED_ORIGINS: "https://meujogo.pages.dev, https://outro.com" });
    expect(originAllowed(withOrigin("https://meujogo.pages.dev"), e)).toBe(true);
    expect(originAllowed(withOrigin("https://outro.com"), e)).toBe(true);
    expect(originAllowed(withOrigin("https://intruso.com"), e)).toBe(false);
    expect(originAllowed(withOrigin(null), e)).toBe(false); // sem Origin (um script) não passa
  });

  test("uma origem não permitida leva a 403, depois do limite de tentativas", async () => {
    const e = env({ ALLOWED_ORIGINS: "https://meujogo.pages.dev" });
    const result = await screenRequest(ws("/room/XXABCD", { Origin: "https://intruso.com" }), e);
    expect(result.response.status).toBe(403);
  });
});
