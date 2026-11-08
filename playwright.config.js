import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testIgnore: /(relay-worker.*|online-turnstile|site-worker|online-same-origin)\.spec\.js/, // roda com `npm run test:worker` (precisa do wrangler dev)
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3000",
    // Usa o Google Chrome instalado no sistema, evitando baixar um navegador do Playwright.
    channel: "chrome",
    headless: true,
    launchOptions: { args: ["--autoplay-policy=no-user-gesture-required"] },
  },
  webServer: [
    {
      command: "npx serve . -l 3000",
      url: "http://localhost:3000",
      reuseExistingServer: true,
    },
    {
      // O servidor de repasse do modo online (tests/online.spec.js).
      command: "node server/relay.js",
      url: "http://localhost:8787/health",
      reuseExistingServer: true,
    },
  ],
});
