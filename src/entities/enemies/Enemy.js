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

  // Players ordered by horizontal distance to this enemy, nearest first.
  playersNearestFirst() {
    const x = this.sprite.body.position.x;
    return [...this.scene.players].sort(
      (a, b) => Math.abs(x - a.sprite.body.position.x) - Math.abs(x - b.sprite.body.position.x)
    );
  }

  // The player closest to this enemy (Arcade physics distance).
  closestPlayer() {
    const sprites = this.scene.players.map((player) => player.sprite);
    return this.scene.physics.closest(this.sprite, sprites).getData("owner");
  }
}
