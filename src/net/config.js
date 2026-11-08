// Where the relay server is. On localhost it is the one started by `npm run relay`. In production
// it will be the Cloudflare Worker: fill PRODUCTION_RELAY_URL in after deploying it
// (for example "wss://yinyang-relay.<account>.workers.dev"). A ?relay=ws://... in the URL overrides both.
export const LOCAL_RELAY_URL = "ws://localhost:8787";
export const PRODUCTION_RELAY_URL = null;

// The public "site key" of the Turnstile widget (the secret key never goes in the code: see
// worker/DEPLOY.md). While it is null the game does not ask for the challenge, which is right for the
// local relay and for the Worker until you turn Turnstile on. A ?turnstileKey=... in the URL overrides it.
export const TURNSTILE_SITE_KEY = null;

export function getTurnstileSiteKey(search) {
  return new URLSearchParams(search).get("turnstileKey") || TURNSTILE_SITE_KEY;
}
export function getRelayUrl(search, hostname) {
  const override = new URLSearchParams(search).get("relay");
  if (override) return override;
  if (hostname === "localhost" || hostname === "127.0.0.1") return LOCAL_RELAY_URL;
  return PRODUCTION_RELAY_URL;
}
