export const MAX_SOUL_COUNT = 190;

export class GameState {
  constructor() {
    this.soulCount = MAX_SOUL_COUNT;
    this.bossesDefeated = 0;
    this.hasYellowKey = false;
    this.hasBlueKey = false;
    this.isGameOver = false;
    this.isEndgame = false;
  }
}
