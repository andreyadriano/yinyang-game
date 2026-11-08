import { EventBus } from "./EventBus.js";
import { GAME_EVENT } from "./gameEvents.js";

export const MAX_SOUL_COUNT = 190;
export const TOTAL_BOSSES = 2;

// The shared state of a run: plain data that can be saved as JSON (toJSON) and restored.
// Changes go through the methods below, which announce them on `events` (see gameEvents.js).
export class GameState {
  constructor() {
    this.events = new EventBus();
    this.soulCount = MAX_SOUL_COUNT;
    this.bossesDefeated = 0;
    this.keys = { yellow: false, blue: false };
    this.isGameOver = false;
    this.isEndgame = false;
  }

  loseSoul(amount, source) {
    this.soulCount -= amount;
    this.events.emit(GAME_EVENT.SOUL_LOST, { amount, source, soulCount: this.soulCount });
  }

  collectKey(color) {
    this.keys[color] = true;
    this.events.emit(GAME_EVENT.KEY_COLLECTED, { key: color });
  }

  hasKey(color) {
    return this.keys[color];
  }

  useKey(color) {
    this.keys[color] = false;
  }

  defeatBoss(id) {
    this.bossesDefeated += 1;
    this.events.emit(GAME_EVENT.BOSS_DEFEATED, { id, total: this.bossesDefeated });
  }

  allBossesDefeated() {
    return this.bossesDefeated === TOTAL_BOSSES;
  }

  gameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.events.emit(GAME_EVENT.GAME_OVER, {});
  }

  endGame() {
    if (this.isEndgame) return;
    this.isEndgame = true;
    this.events.emit(GAME_EVENT.ENDGAME, {});
  }

  toJSON() {
    return {
      soulCount: this.soulCount,
      bossesDefeated: this.bossesDefeated,
      keys: { ...this.keys },
      isGameOver: this.isGameOver,
      isEndgame: this.isEndgame
    };
  }

  // Puts saved data back without announcing events (the changes already happened elsewhere).
  restore(data) {
    this.soulCount = data.soulCount;
    this.bossesDefeated = data.bossesDefeated;
    this.keys = { ...data.keys };
    this.isGameOver = data.isGameOver;
    this.isEndgame = data.isEndgame;
  }
}
