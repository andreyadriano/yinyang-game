// Where the relay server is. On localhost it is the one started by `npm run relay`. In production
// it will be the Cloudflare Worker: fill PRODUCTION_RELAY_URL in after deploying it
// (for example "wss://yinyang-relay.<account>.workers.dev"). A ?relay=ws://... in the URL overrides both.
export const LOCAL_RELAY_URL = "ws://localhost:8787";
export const PRODUCTION_RELAY_URL = null;

export function getRelayUrl(search, hostname) {
  const override = new URLSearchParams(search).get("relay");
  if (override) return override;
  if (hostname === "localhost" || hostname === "127.0.0.1") return LOCAL_RELAY_URL;
  return PRODUCTION_RELAY_URL;
}
