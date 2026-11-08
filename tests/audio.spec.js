import { test, expect } from "@playwright/test";
import { AudioManager } from "../src/core/AudioManager.js";

// Testes do AudioManager com um "som" de mentira, sem navegador.

function fakeScene() {
  const played = [];
  const sound = {
    add: (assetKey) => ({
      assetKey,
      isPlaying: false,
      play(config) {
        played.push({ assetKey, config });
        this.isPlaying = true;
      },
    }),
    locked: false,
  };
  return { scene: { sound }, played };
}

test.describe("AudioManager", () => {
  test("play toca o som e avisa quem ouve, com nome e volume", () => {
    const { scene, played } = fakeScene();
    const audio = new AudioManager(scene);
    audio.addAll({ jump: "jumping", slimeAttack: "slimeatk" });
    const announced = [];
    audio.events.on("play", (e) => announced.push(e));

    audio.play("jump", { volume: 0.3 });
    audio.play("slimeAttack");

    expect(played).toEqual([
      { assetKey: "jumping", config: { volume: 0.3 } },
      { assetKey: "slimeatk", config: undefined },
    ]);
    expect(announced).toEqual([
      { name: "jump", volume: 0.3 },
      { name: "slimeAttack", volume: undefined },
    ]);
  });

  test("playQuiet toca sem avisar (é o que o convidado usa)", () => {
    const { scene, played } = fakeScene();
    const audio = new AudioManager(scene);
    audio.addAll({ jump: "jumping" });
    const announced = [];
    audio.events.on("play", (e) => announced.push(e));

    audio.playQuiet("jump", { volume: 0.5 });
    expect(played).toHaveLength(1);
    expect(announced).toEqual([]);
  });

  test("um som que não existe não derruba o jogo no playQuiet", () => {
    const { scene } = fakeScene();
    const audio = new AudioManager(scene);
    expect(() => audio.playQuiet("inexistente")).not.toThrow();
  });

  test("isPlaying acompanha o som", () => {
    const { scene } = fakeScene();
    const audio = new AudioManager(scene);
    audio.addAll({ jump: "jumping" });
    expect(audio.isPlaying("jump")).toBe(false);
    audio.play("jump");
    expect(audio.isPlaying("jump")).toBe(true);
  });
});
