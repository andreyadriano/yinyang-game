import { defineConfig } from "@playwright/test";

// Testes do Worker da Cloudflare: sobe `wrangler dev` na porta 8788 e roda só tests/relay-worker.spec.js.
export default defineConfig({
  testDir: "./tests",
  testMatch: "relay-worker.spec.js",
  timeout: 60_000,
  webServer: {
    command: "npx wrangler dev --config worker/wrangler.jsonc --port 8788",
    url: "http://localhost:8788/health",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
