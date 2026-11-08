import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";

// A configuração do Worker (wrangler.jsonc, na raiz do repositório). O Workers Builds (a integração com o
// Git da Cloudflare) procura esse arquivo na raiz e exige que o nome dele seja o do Worker no painel.

// Lê um JSONC: tira os comentários sem estragar textos que têm // dentro (como "https://...").
function readJsonc(path) {
  const text = readFileSync(path, "utf8");
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      let j = i + 1;
      while (text[j] !== '"') j += text[j] === "\\" ? 2 : 1;
      out += text.slice(i, j + 1);
      i = j;
    } else if (char === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
    } else if (char === "/" && text[i + 1] === "*") {
      i = text.indexOf("*/", i) + 1;
    } else {
      out += char;
    }
  }
  return JSON.parse(out);
}

const config = readJsonc("wrangler.jsonc");

test("o wrangler.jsonc fica na raiz, e não em worker/", () => {
  expect(existsSync("wrangler.jsonc")).toBe(true);
  expect(existsSync("worker/wrangler.jsonc")).toBe(false);
});

test('o Worker se chama "yinyang" (igual ao nome no painel da Cloudflare)', () => {
  expect(config.name).toBe("yinyang");
});

test("o arquivo principal existe e exporta a classe do Durable Object", () => {
  expect(existsSync(config.main)).toBe(true);
  expect(readFileSync(config.main, "utf8")).toMatch(/export \{ Room \}/);
});

test("o Durable Object está ligado, com armazenamento SQLite (o único aceito no plano gratuito)", () => {
  expect(config.durable_objects.bindings).toEqual([{ name: "ROOMS", class_name: "Room" }]);
  expect(config.migrations).toEqual([{ tag: "v1", new_sqlite_classes: ["Room"] }]);
});

test("o site é a pasta dist/, que o build monta", () => {
  expect(config.assets.directory).toBe("./dist");
  const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts;
  expect(scripts["build:site"]).toContain("scripts/build-site.mjs");
  expect(scripts.deploy).toContain("worker:deploy");
  expect(scripts["worker:deploy"]).toMatch(/build:site.*wrangler deploy/);
});

test("os scripts usam a configuração da raiz, sem apontar para outro lugar", () => {
  const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts;
  for (const [name, command] of Object.entries(scripts)) expect(command, name).not.toContain("--config");
});

test("os padrões de segurança são os esperados, e nenhum segredo está no arquivo", () => {
  expect(config.vars.ALLOWED_ORIGINS).toBe("self");
  expect(config.vars.ONLINE_ENABLED).toBe("true");
  expect(JSON.stringify(config)).not.toMatch(/TURNSTILE_SECRET|secret/i);
});

test("a chave de teste do Turnstile não está ligada por padrão (sem a secret, o desafio fica desligado)", () => {
  expect(config.vars.TURNSTILE_SECRET).toBeUndefined();
});
