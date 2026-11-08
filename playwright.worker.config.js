import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

// Testes do Worker da Cloudflare, com duas instâncias de `wrangler dev`:
//   8788  normal (limites generosos, para os testes que abrem muitas conexões): relay-worker.spec.js
//   8789  rígida (3 conexões por endereço, sala esperando 3 s, vida máxima de 7 s): relay-worker-strict.spec.js
//   8790  com o Turnstile ligado (chaves de teste da Cloudflare): relay-worker-turnstile.spec.js e online-turnstile.spec.js
//   8791  com o Turnstile ligado e uma chave secreta que sempre recusa: relay-worker-turnstile.spec.js
//   8792  como em produção: serve o site e as salas, e só aceita a própria página (ALLOWED_ORIGINS = "self"):
//         site-worker.spec.js e online-same-origin.spec.js
//   3000  o jogo (para o online-turnstile.spec.js)
// O Worker serve o site (dist/): é preciso montá-lo antes (npm run build:site; os scripts npm já fazem isso).
if (!existsSync("dist/index.html")) {
  throw new Error("dist/ não existe: rode `npm run build:site` (ou use `npm run test:worker`).");
}

export default defineConfig({
  testDir: "./tests",
  testMatch: /(relay-worker.*|online-turnstile|site-worker|online-same-origin)\.spec\.js/,
  use: {
    baseURL: "http://localhost:3000",
    channel: "chrome",
    headless: true,
    launchOptions: { args: ["--autoplay-policy=no-user-gesture-required"] },
  },
  timeout: 60_000,
  webServer: [
    {
      command:
        "npx wrangler dev --config worker/wrangler.jsonc --port 8788 --var ALLOWED_ORIGINS:* --var CONNECT_BURST:5000 --var CONNECT_PER_MINUTE:6000",
      url: "http://localhost:8788/health",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command:
        "npx wrangler dev --config worker/wrangler.jsonc --port 8789 --inspector-port 9230 --persist-to .wrangler/state-strict " +
        "--var ALLOWED_ORIGINS:* --var CLIENT_ID_HEADER:x-client-id --var CONNECT_BURST:3 --var CONNECT_PER_MINUTE:1 " +
        "--var ROOM_WAITING_MS:3000 --var ROOM_MAX_MS:7000 --var ROOM_CHECK_MS:1000",
      url: "http://localhost:8789/health",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command:
        "npx wrangler dev --config worker/wrangler.jsonc --port 8790 --inspector-port 9231 --persist-to .wrangler/state-turnstile " +
        "--var ALLOWED_ORIGINS:* --var TURNSTILE_SECRET:1x0000000000000000000000000000000AA --var CONNECT_BURST:5000 --var CONNECT_PER_MINUTE:6000",
      url: "http://localhost:8790/health",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command:
        "npx wrangler dev --config worker/wrangler.jsonc --port 8791 --inspector-port 9232 --persist-to .wrangler/state-turnstile-fail " +
        "--var ALLOWED_ORIGINS:* --var TURNSTILE_SECRET:2x0000000000000000000000000000000AA --var CONNECT_BURST:5000 --var CONNECT_PER_MINUTE:6000",
      url: "http://localhost:8791/health",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      // Sem --var de ALLOWED_ORIGINS: vale o "self" do wrangler.jsonc, como em produção.
      command: "npx wrangler dev --config worker/wrangler.jsonc --port 8792 --inspector-port 9233 --persist-to .wrangler/state-site --var CONNECT_BURST:5000 --var CONNECT_PER_MINUTE:6000",
      url: "http://localhost:8792/health",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "npx serve . -l 3000",
      url: "http://localhost:3000",
      reuseExistingServer: true,
    },
  ],
});
