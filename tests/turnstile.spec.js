import { test, expect } from "@playwright/test";
import { verifyTurnstile } from "../worker/src/turnstile.js";
import { resetConnectLimiter, screenRequest } from "../worker/src/guards.js";

// A verificação do Turnstile no servidor, com a chamada à Cloudflare simulada (sem rede).

// Uma "Cloudflare" de mentira: guarda o que recebeu e responde o que mandarmos.
function fakeSiteverify(answer) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, method: init.method, form: Object.fromEntries(init.body.entries()) });
    if (answer instanceof Error) throw answer;
    return new Response(typeof answer === "string" ? answer : JSON.stringify(answer));
  };
  return { fetchImpl, calls };
}

test.describe("verifyTurnstile", () => {
  test("manda a chave secreta, o token e o endereço para a Cloudflare e aceita a resposta de sucesso", async () => {
    const { fetchImpl, calls } = fakeSiteverify({ success: true, "error-codes": [] });
    const result = await verifyTurnstile({ token: "tok", secret: "segredo", ip: "203.0.113.7", fetchImpl });
    expect(result).toEqual({ success: true, errors: [] });
    expect(calls).toEqual([
      {
        url: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        method: "POST",
        form: { secret: "segredo", response: "tok", remoteip: "203.0.113.7" },
      },
    ]);
  });

  test("sem endereço conhecido, não manda remoteip", async () => {
    for (const ip of [null, undefined, "unknown"]) {
      const { fetchImpl, calls } = fakeSiteverify({ success: true });
      await verifyTurnstile({ token: "tok", secret: "s", ip, fetchImpl });
      expect(calls[0].form).toEqual({ secret: "s", response: "tok" });
    }
  });

  test("devolve os códigos de erro da Cloudflare quando recusa", async () => {
    const { fetchImpl } = fakeSiteverify({ success: false, "error-codes": ["invalid-input-response"] });
    expect(await verifyTurnstile({ token: "tok", secret: "s", fetchImpl })).toEqual({
      success: false,
      errors: ["invalid-input-response"],
    });
  });

  test("um token já usado é recusado (timeout-or-duplicate)", async () => {
    const { fetchImpl } = fakeSiteverify({ success: false, "error-codes": ["timeout-or-duplicate"] });
    const result = await verifyTurnstile({ token: "tok", secret: "s", fetchImpl });
    expect(result.success).toBe(false);
    expect(result.errors).toEqual(["timeout-or-duplicate"]);
  });

  test("sem token, ou com token grande demais, nem chama a Cloudflare", async () => {
    for (const token of [null, "", undefined, "x".repeat(2049)]) {
      const { fetchImpl, calls } = fakeSiteverify({ success: true });
      const result = await verifyTurnstile({ token, secret: "s", fetchImpl });
      expect(result.success, String(token).slice(0, 10)).toBe(false);
      expect(calls).toHaveLength(0);
    }
  });

  test("se a Cloudflare não responde, recusa (falha fechada)", async () => {
    const { fetchImpl } = fakeSiteverify(new Error("sem rede"));
    expect(await verifyTurnstile({ token: "tok", secret: "s", fetchImpl })).toEqual({
      success: false,
      errors: ["network-error"],
    });
  });

  test("uma resposta que não é o esperado também é recusada", async () => {
    for (const answer of ["isto não é json", "{}", '{"success":"sim"}', "null"]) {
      const { fetchImpl } = fakeSiteverify(answer);
      const result = await verifyTurnstile({ token: "tok", secret: "s", fetchImpl });
      expect(result.success, answer).toBe(false);
    }
  });
});

test.describe("guards com Turnstile", () => {
  const request = (path, { ts, headers = {} } = {}) =>
    new Request(`https://relay.example${path}${ts ? `?ts=${ts}` : ""}`, { headers: { Upgrade: "websocket", ...headers } });
  const withSecret = (extra = {}) => ({ TURNSTILE_SECRET: "segredo", ...extra });

  test.beforeEach(() => resetConnectLimiter());

  test("sem TURNSTILE_SECRET o Turnstile está desligado: nada é pedido nem chamado", async () => {
    const { fetchImpl, calls } = fakeSiteverify({ success: true });
    expect(await screenRequest(request("/room/XXABCD"), {}, { fetchImpl })).toEqual({ ok: true, code: "XXABCD" });
    expect(await screenRequest(request("/room/XXABCD", { ts: "qualquer" }), {}, { fetchImpl })).toEqual({ ok: true, code: "XXABCD" });
    expect(calls).toHaveLength(0);
  });

  test("com o segredo configurado, sem token a conexão é recusada com challenge-required", async () => {
    const { fetchImpl, calls } = fakeSiteverify({ success: true });
    expect(await screenRequest(request("/room/XXABCD"), withSecret(), { fetchImpl })).toEqual({
      ok: false,
      rejectWith: "challenge-required",
    });
    expect(calls).toHaveLength(0);
  });

  test("com um token válido a conexão passa, e a Cloudflare recebe o segredo, o token e o endereço", async () => {
    const { fetchImpl, calls } = fakeSiteverify({ success: true });
    const req = request("/room/XXABCD", { ts: "tok-bom", headers: { "CF-Connecting-IP": "198.51.100.9" } });
    expect(await screenRequest(req, withSecret(), { fetchImpl })).toEqual({ ok: true, code: "XXABCD" });
    expect(calls).toHaveLength(1);
    expect(calls[0].form).toEqual({ secret: "segredo", response: "tok-bom", remoteip: "198.51.100.9" });
  });

  test("com um token inválido a conexão é recusada com challenge-failed", async () => {
    const { fetchImpl } = fakeSiteverify({ success: false, "error-codes": ["invalid-input-response"] });
    expect(await screenRequest(request("/room/XXABCD", { ts: "tok-ruim" }), withSecret(), { fetchImpl })).toEqual({
      ok: false,
      rejectWith: "challenge-failed",
    });
  });

  test("se a verificação da Cloudflare cair, ninguém entra", async () => {
    const { fetchImpl } = fakeSiteverify(new Error("fora do ar"));
    const result = await screenRequest(request("/room/XXABCD", { ts: "tok" }), withSecret(), { fetchImpl });
    expect(result).toEqual({ ok: false, rejectWith: "challenge-failed" });
  });

  test("as recusas baratas vêm antes: elas não gastam nenhuma chamada à Cloudflare", async () => {
    const { fetchImpl, calls } = fakeSiteverify({ success: true });
    const cases = [
      [request("/outra-coisa", { ts: "t" }), withSecret()], // 404
      [new Request("https://relay.example/room/XXABCD?ts=t"), withSecret()], // 426
      [request("/room/XXABCD", { ts: "t" }), withSecret({ ONLINE_ENABLED: "false" })], // 503
      [request("/room/XXABCD", { ts: "t", headers: { Origin: "https://intruso.com" } }), withSecret({ ALLOWED_ORIGINS: "https://meujogo.com" })], // 403
      [request("/room/abc", { ts: "t" }), withSecret()], // código inválido
    ];
    for (const [req, env] of cases) await screenRequest(req, env, { fetchImpl });
    expect(calls).toHaveLength(0);
  });

  test("muitas tentativas sem passar pelo limite também não chegam à Cloudflare", async () => {
    const { fetchImpl, calls } = fakeSiteverify({ success: true });
    const env = withSecret({ CONNECT_BURST: "2", CONNECT_PER_MINUTE: "1", CLIENT_ID_HEADER: "x-client" });
    const attempt = () => screenRequest(request("/room/XXABCD", { ts: "t", headers: { "x-client": "script" } }), env, { fetchImpl });
    const results = [];
    for (let i = 0; i < 6; i++) results.push((await attempt()).ok);
    expect(results).toEqual([true, true, false, false, false, false]);
    expect(calls).toHaveLength(2); // só as duas que passaram pelo limite
  });
});
