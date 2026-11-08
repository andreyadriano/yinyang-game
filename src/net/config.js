// Where the relay server is.
//   - On localhost it is the one started by `npm run relay`.
//   - Anywhere else it is the same address as the page: in production one Worker serves both the game and
//     the rooms, so there is nothing to configure. Set PRODUCTION_RELAY_URL (for example
//     "wss://relay.exemplo.com") only if the relay lives somewhere else.
//   - ?relay=ws://... in the URL overrides both, and ?relay=same means "the address of this page"
//     (for trying the Worker locally with `npm run worker:dev`, which serves the game too).
export const LOCAL_RELAY_URL = "ws://localhost:8787";
export const PRODUCTION_RELAY_URL = null;

// The public "site key" of the Turnstile widget (the secret key never goes in the code: see
// worker/DEPLOY.md). While it is null the game does not ask for the challenge, which is right for the
// local relay and for the Worker until you turn Turnstile on. A ?turnstileKey=... in the URL overrides it.
export const TURNSTILE_SITE_KEY = null;

export function getTurnstileSiteKey(search) {
  return new URLSearchParams(search).get("turnstileKey") || TURNSTILE_SITE_KEY;
}
// `place` is the page's location: { hostname, origin } (window.location has both).
export function getRelayUrl(search, place) {
  const override = new URLSearchParams(search).get("relay");
  if (override === "same") return sameOriginRelay(place.origin);
  if (override) return override;
  if (place.hostname === "localhost" || place.hostname === "127.0.0.1") return LOCAL_RELAY_URL;
  return PRODUCTION_RELAY_URL ?? sameOriginRelay(place.origin);
}

// https://jogo.exemplo.com -> wss://jogo.exemplo.com (and http: -> ws:)
function sameOriginRelay(origin) {
  return origin.replace(/^http/, "ws");
}
