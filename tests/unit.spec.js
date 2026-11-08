import { test, expect } from "@playwright/test";
import { EventBus } from "../src/core/EventBus.js";
import { GameState, MAX_SOUL_COUNT } from "../src/core/GameState.js";
import { GAME_EVENT } from "../src/core/gameEvents.js";
import { FixedStepper, STEP_MS } from "../src/sim/FixedStepper.js";
import { EntityRegistry } from "../src/sim/EntityRegistry.js";

// Testes das peças puras da simulação: rodam no Node, sem navegador.

test.describe("EventBus", () => {
  test("entrega o evento a quem ouve e para depois de off", () => {
    const bus = new EventBus();
    const received = [];
    const stop = bus.on("x", (data) => received.push(data));
    bus.emit("x", 1);
    stop();
    bus.emit("x", 2);
    expect(received).toEqual([1]);
  });

  test("emitir um evento sem ouvintes não dá erro", () => {
    expect(() => new EventBus().emit("nada", {})).not.toThrow();
  });
});

test.describe("GameState", () => {
  const record = (state) => {
    const events = [];
    for (const name of Object.values(GAME_EVENT)) state.events.on(name, (data) => events.push([name, data]));
    return events;
  };

  test("perder vida muda o estado e avisa quem causou", () => {
    const state = new GameState();
    const events = record(state);
    state.loseSoul(5, "slime-3");
    expect(state.soulCount).toBe(MAX_SOUL_COUNT - 5);
    expect(events).toEqual([[GAME_EVENT.SOUL_LOST, { amount: 5, source: "slime-3", soulCount: MAX_SOUL_COUNT - 5 }]]);
  });

  test("pegar e usar uma chave", () => {
    const state = new GameState();
    const events = record(state);
    expect(state.hasKey("yellow")).toBe(false);
    state.collectKey("yellow");
    expect(state.hasKey("yellow")).toBe(true);
    expect(state.hasKey("blue")).toBe(false);
    state.useKey("yellow");
    expect(state.hasKey("yellow")).toBe(false);
    expect(events).toEqual([[GAME_EVENT.KEY_COLLECTED, { key: "yellow" }]]);
  });

  test("dois chefes derrotados liberam a porta", () => {
    const state = new GameState();
    state.defeatBoss("demon-0");
    expect(state.allBossesDefeated()).toBe(false);
    state.defeatBoss("demon-1");
    expect(state.allBossesDefeated()).toBe(true);
  });

  test("game over e fim de jogo só avisam uma vez", () => {
    const state = new GameState();
    const events = record(state);
    state.gameOver();
    state.gameOver();
    state.endGame();
    state.endGame();
    expect(events.map(([name]) => name)).toEqual([GAME_EVENT.GAME_OVER, GAME_EVENT.ENDGAME]);
  });

  test("vira JSON e volta sem avisar eventos", () => {
    const state = new GameState();
    state.loseSoul(40, "demon-0");
    state.collectKey("blue");
    state.defeatBoss("demon-0");

    const saved = JSON.parse(JSON.stringify(state));
    expect(saved).toEqual({
      soulCount: MAX_SOUL_COUNT - 40,
      bossesDefeated: 1,
      keys: { yellow: false, blue: true },
      isGameOver: false,
      isEndgame: false,
    });

    const other = new GameState();
    const events = record(other);
    other.restore(saved);
    expect(JSON.parse(JSON.stringify(other))).toEqual(saved);
    expect(events).toEqual([]);
  });
});

test.describe("FixedStepper", () => {
  test("em 60 quadros por segundo dá um passo por quadro", () => {
    const stepper = new FixedStepper();
    let steps = 0;
    for (let frame = 0; frame < 60; frame++) stepper.advance(STEP_MS, () => steps++);
    expect(steps).toBe(60);
    expect(stepper.tick).toBe(60);
  });

  test("em tela rápida (144 Hz) pula passos, e o total em 1 segundo continua ~60", () => {
    const stepper = new FixedStepper();
    let steps = 0;
    for (let frame = 0; frame < 144; frame++) stepper.advance(1000 / 144, () => steps++);
    expect(steps).toBeGreaterThanOrEqual(59);
    expect(steps).toBeLessThanOrEqual(60);
  });

  test("em aparelho lento (20 quadros por segundo) roda vários passos por quadro", () => {
    const stepper = new FixedStepper();
    const perFrame = [];
    for (let frame = 0; frame < 20; frame++) {
      let steps = 0;
      stepper.advance(50, () => steps++);
      perFrame.push(steps);
    }
    expect(Math.min(...perFrame)).toBeGreaterThanOrEqual(2);
    expect(perFrame.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(59);
  });

  test("depois de uma travada longa, descarta o tempo em vez de rodar milhares de passos", () => {
    const stepper = new FixedStepper();
    let steps = 0;
    stepper.advance(10_000, () => steps++);
    expect(steps).toBeLessThanOrEqual(5);
  });

  test("passa o tamanho fixo do passo", () => {
    const stepper = new FixedStepper();
    const sizes = [];
    stepper.advance(40, (ms) => sizes.push(ms));
    expect(sizes.every((ms) => ms === STEP_MS)).toBe(true);
  });
});

test.describe("EntityRegistry", () => {
  test("gera ids pelo tipo e pela ordem, e respeita ids que a entidade já tem", () => {
    const registry = new EntityRegistry();
    const slimes = [{}, {}, {}].map((entity) => registry.add("slime", entity));
    const player = registry.add("player", { id: "player-yin" });
    expect(slimes.map((s) => s.id)).toEqual(["slime-0", "slime-1", "slime-2"]);
    expect(player.id).toBe("player-yin");
    expect(registry.get("slime-1")).toBe(slimes[1]);
    expect(registry.ids()).toEqual(["slime-0", "slime-1", "slime-2", "player-yin"]);
  });

  test("id repetido é erro", () => {
    const registry = new EntityRegistry();
    registry.add("player", { id: "player-yin" });
    expect(() => registry.add("player", { id: "player-yin" })).toThrow(/Duplicate entity id/);
  });

  test("só salva e restaura quem tem getState e setState", () => {
    const registry = new EntityRegistry();
    let restored = null;
    registry.add("thing", { getState: () => ({ a: 1 }), setState: (s) => (restored = s) });
    registry.add("portal", {});
    expect(registry.getStates()).toEqual({ "thing-0": { a: 1 } });

    registry.setStates({ "thing-0": { a: 2 }, "ghost-9": { a: 3 } });
    expect(restored).toEqual({ a: 2 });
  });
});
