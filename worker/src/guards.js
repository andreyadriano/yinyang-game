import { ROOM_CODE_PATTERN } from "../../src/net/protocol.js";
import { KeyedRateLimiter } from "../../src/net/RateLimiter.js";
import { verifyTurnstile } from "./turnstile.js";

// Everything the Worker can refuse cheaply, before a room (a Durable Object) is touched. It has no
// Cloudflare-only code in it, so the tests can run it in Node.
//
// The checks, in order (the cheapest first):
//   1. the address is not a room address                      -> 404
//   2. it is not a WebSocket connection                       -> 426
//   3. the off switch is on (ONLINE_ENABLED = "false")        -> 503
//   4. too many attempts from this address                    -> 429
//   5. the page is not allowed (ALLOWED_ORIGINS; "self" by default) -> 403
//   6. the room code is not valid                             -> a WebSocket that says "bad-room"
//   7. Turnstile is on (TURNSTILE_SECRET is set) and the connection has no valid token (?ts=...)
//                                                             -> a WebSocket that says "challenge-required"
//                                                                or "challenge-failed"
//
// The Turnstile check is last because it is the only one that costs a network call to Cloudflare.
//
// screenRequest returns { ok: true, code } when the request may go on to the room, and otherwise
// { ok: false, response } or { ok: false, rejectWith } (the Worker turns that into a socket that
// says why it is being refused).
const DEFAULT_BURST = 20;
const DEFAULT_PER_MINUTE = 20;

let connectLimiter = null;

// For tests: forget the addresses seen so far (and pick up new limits from `env`).
export function resetConnectLimiter() {
  connectLimiter = null;
}

export async function screenRequest(request, env, { fetchImpl } = {}) {
  const url = new URL(request.url);

  const match = url.pathname.match(/^\/room\/([^/?#]+)$/);
  if (!match) return refuse(new Response("Not found", { status: 404 }));

  if (request.headers.get("Upgrade") !== "websocket") {
    return refuse(new Response("Expected a WebSocket connection", { status: 426 }));
  }

  // The off switch: set ONLINE_ENABLED to "false" and redeploy to stop new rooms during an attack.
  if (env.ONLINE_ENABLED === "false") return refuse(new Response("Online play is switched off", { status: 503 }));

  if (!(await withinConnectionLimit(request, env))) {
    return refuse(
      new Response("Too many connection attempts. Try again in a minute.", {
        status: 429,
        headers: { "Retry-After": "60" }
      })
    );
  }

  if (!originAllowed(request, env)) return refuse(new Response("Forbidden", { status: 403 }));

  const code = match[1];
  // Rooms are created by name, so a bad code is turned away before any room exists.
  if (!ROOM_CODE_PATTERN.test(code)) return { ok: false, rejectWith: "bad-room" };

  if (env.TURNSTILE_SECRET) {
    const token = url.searchParams.get("ts");
    if (!token) return { ok: false, rejectWith: "challenge-required" };

    const ip = request.headers.get("CF-Connecting-IP");
    const { success } = await verifyTurnstile({ token, secret: env.TURNSTILE_SECRET, ip, fetchImpl });
    if (!success) return { ok: false, rejectWith: "challenge-failed" };
  }

  return { ok: true, code };
}

function refuse(response) {
  return { ok: false, response };
}

// Who is asking: the address Cloudflare saw (it cannot be forged by the client). CLIENT_ID_HEADER only
// exists so the tests can pretend to be different clients; leave it unset in production.
export function clientKey(request, env) {
  const fromHeader = env.CLIENT_ID_HEADER ? request.headers.get(env.CLIENT_ID_HEADER) : null;
  return fromHeader ?? request.headers.get("CF-Connecting-IP") ?? "unknown";
}

// A limit on connection attempts per address. The first check lives in this Worker's memory, which
// costs nothing and is enough against a script hammering from one place (each Cloudflare location and
// each Worker instance counts for itself, so it is approximate). The second is Cloudflare's Rate
// Limiting binding, used only if you add it to wrangler.jsonc (see worker/README.md).
async function withinConnectionLimit(request, env) {
  const key = clientKey(request, env);

  connectLimiter ??= new KeyedRateLimiter({
    capacity: Number(env.CONNECT_BURST) || DEFAULT_BURST,
    refillPerSecond: (Number(env.CONNECT_PER_MINUTE) || DEFAULT_PER_MINUTE) / 60,
    maxKeys: 5000
  });
  if (!connectLimiter.allow(key)) return false;

  if (env.CONNECT_LIMITER) {
    const { success } = await env.CONNECT_LIMITER.limit({ key });
    if (!success) return false;
  }
  return true;
}

// ALLOWED_ORIGINS is a comma separated list of pages that may open a room:
//   "self"      the page served by this same Worker (its own address)
//   "*" or ""   any page
//   an address  such as "https://outro.exemplo.com"
// A browser always says which page the connection comes from (the Origin header). A script can
// pretend, which is why this is one layer among several and not the only one.
export function originAllowed(request, env) {
  const allowed = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (allowed.length === 0 || allowed.includes("*")) return true;

  const origin = request.headers.get("Origin") ?? "";
  const self = new URL(request.url).origin;
  return allowed.some((entry) => (entry === "self" ? origin === self : origin === entry));
}
