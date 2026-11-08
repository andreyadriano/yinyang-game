const SPIKE_DAMAGE = 4;
const SPIKE_BOUNCE_VELOCITY = -420;

export class Spikes {
  constructor(scene, spikeData, { gameState } = {}) {
    this.scene = scene;
    this.gameState = gameState;
    this.group = scene.physics.add.staticGroup();

    spikeData.forEach(({ x, y, scale, width, height, offsetX, offsetY }) => {
      const spike = this.group.create(x, y, "spike");
      if (scale !== undefined) spike.setScale(scale);
      if (width !== undefined) spike.setSize(width, height);
      if (offsetX !== undefined) spike.setOffset(offsetX, offsetY);
    });
  }

  // Called once the players exist: touching a spike hurts the player.
  bindPlayers(players) {
    players.forEach((player) => {
      this.scene.physics.add.overlap(player.sprite, this.group, () => this.handlePlayerHit(player));
    });
  }

  handlePlayerHit(player) {
    player.sprite.setTint(0xff0000);
    if (!player.isDead()) {
      player.sprite.anims.play(player.anim("hurt"));
      player.sprite.setVelocityY(SPIKE_BOUNCE_VELOCITY);
      this.gameState.soulCount -= SPIKE_DAMAGE;
    }
  }
}
