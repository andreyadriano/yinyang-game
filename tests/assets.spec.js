import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { ASSETS, GAME_SOUNDS } from "../src/data/assets.js";
import { PLAYER_ANIMATIONS, PLAYER_CHARACTERS } from "../src/data/playerAnimations.js";

// Testes dos dados: não abrem o navegador.

const allAssets = Object.values(ASSETS).flat();

test("todo arquivo do manifesto de assets existe", () => {
  const missing = allAssets.filter(({ path }) => !existsSync(path)).map(({ key, path }) => `${key}: ${path}`);
  expect(missing).toEqual([]);
});

test("as chaves do manifesto não se repetem dentro de cada tipo", () => {
  for (const [kind, list] of Object.entries(ASSETS)) {
    const keys = list.map(({ key }) => key);
    expect(new Set(keys).size, `chaves repetidas em ${kind}`).toBe(keys.length);
  }
});

test("todo som do jogo aponta para um áudio do manifesto", () => {
  const audioKeys = ASSETS.audio.map(({ key }) => key);
  for (const [name, assetKey] of Object.entries(GAME_SOUNDS)) {
    expect(audioKeys, `som "${name}"`).toContain(assetKey);
  }
});

test("as animações dos jogadores usam spritesheets do manifesto", () => {
  const sheets = ASSETS.spritesheets.map(({ key }) => key);
  for (const character of PLAYER_CHARACTERS) {
    expect(sheets).toContain(character);
    for (const [name, definition] of Object.entries(PLAYER_ANIMATIONS)) {
      const texture = definition.sheet === "run" ? `${character}run` : character;
      expect(sheets, `${character}-${name}`).toContain(texture);
    }
  }
});
