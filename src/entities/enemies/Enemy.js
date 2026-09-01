export class Enemy {
  constructor(scene, { gameState, audio, animKeys, health } = {}) {
    this.scene = scene;
    this.gameState = gameState;
    this.audio = audio;
    this.animKeys = animKeys;
    this.health = health;
  }

  isPlayingAnim(key) {
    return this.sprite.anims.getCurrentKey() === this.animKeys[key];
  }

  animProgress(key) {
    return this.sprite.anims.getProgress(this.animKeys[key]);
  }
}
