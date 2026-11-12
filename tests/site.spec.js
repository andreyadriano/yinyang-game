import { test, expect } from "@playwright/test";
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { buildSite, MAX_FILE_BYTES, MAX_FILES } from "../scripts/build-site.mjs";
import { ASSETS } from "../src/data/assets.js";

// O pacote que o Worker serve como site (dist/), montado por scripts/build-site.mjs. Sem navegador.

const root = resolve(".");
const out = "dist-test";
let built;

test.beforeAll(() => {
  built = buildSite({ root, out });
});
test.afterAll(() => {
  rmSync(join(root, out), { recursive: true, force: true });
});

const inDist = (path) => existsSync(join(built.dist, path));

function allFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? allFiles(path) : [path];
  });
}

test("o pacote tem a página, o estilo, o código e os arquivos do jogo", () => {
  for (const path of ["index.html", "main.css", "src/main.js", "src/scenes/GameScene.js", "assets/environment/level1.json"]) {
    expect(inDist(path), path).toBe(true);
  }
});

test("nada de servidor, testes, documentação ou dependências vai para o site", () => {
  const top = readdirSync(built.dist).sort();
  expect(top).toEqual(["assets", "index.html", "main.css", "manifest.webmanifest", "src"]);
  expect(inDist("src/../worker")).toBe(false);
  expect(allFiles(built.dist).filter((file) => /node_modules|\.spec\.js$|\.env|\.dev\.vars|wrangler/.test(file))).toEqual([]);
});

test("respeita os limites de arquivos estáticos do plano gratuito", () => {
  expect(built.files).toBeLessThan(MAX_FILES);
  const biggest = Math.max(...allFiles(built.dist).map((file) => statSync(file).size));
  expect(biggest).toBeLessThan(MAX_FILE_BYTES);
});

test("todo arquivo do manifesto de assets do jogo está no pacote", () => {
  const missing = Object.values(ASSETS)
    .flat()
    .filter(({ path }) => !inDist(path))
    .map(({ path }) => path);
  expect(missing).toEqual([]);
});

test("todo import do código do jogo aponta para um arquivo que está no pacote", () => {
  const broken = [];
  for (const file of allFiles(join(built.dist, "src")).filter((f) => f.endsWith(".js"))) {
    const code = readFileSync(file, "utf8");
    for (const [, target] of code.matchAll(/(?:import|export)[^"'`;]*?from\s+["'](\.[^"']+)["']/g)) {
      if (!existsSync(resolve(dirname(file), target))) broken.push(`${file.replace(built.dist, "")}: ${target}`);
    }
  }
  expect(broken).toEqual([]);
});

test("a página carrega o Phaser de uma versão fixa e o jogo como módulo", () => {
  const html = readFileSync(join(built.dist, "index.html"), "utf8");
  expect(html).toMatch(/phaser@\d+\.\d+\.\d+\/dist\/phaser\.min\.js/); // versão fixa, nunca "latest"
  expect(html).toContain('<script type="module" src="src/main.js">');
  expect(html).toContain('href="main.css"');
});

test("montar de novo apaga o que sobrou da vez anterior", () => {
  const stray = join(built.dist, "sobra.txt");
  rmSync(stray, { force: true });
  buildSite({ root, out });
  expect(existsSync(stray)).toBe(false);
  expect(built.files).toBeGreaterThan(100);
});
