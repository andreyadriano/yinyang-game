const OPENING_ANIM = "JailDoor_Opening";

export class JailDoor {
  constructor(scene, { x, y }, { gameState, audio, groundLayers } = {}) {
    this.scene = scene;
    this.gameState = gameState;
    this.audio = audio;

    if (!scene.anims.exists(OPENING_ANIM)) {
      scene.anims.create({
        key: OPENING_ANIM,
        frames: scene.anims.generateFrameNumbers("jaildoor", { start: 0, end: 8 }),
        frameRate: 7,
        repeat: 0
      });
    }

    this.sprite = scene.physics.add.sprite(x, y, "jaildoor");
    this.sprite.setScale(0.5).setSize(40, 160).setOffset(40, 40);
    this.sprite.setBounce(0);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setImmovable(true);

    groundLayers.forEach((layer) => scene.physics.add.collider(this.sprite, layer));
  }

  // Called once the players exist: touching the door after both bosses are down opens it.
  bindPlayers(players) {
    players.forEach((player) => {
      this.scene.physics.add.collider(player.sprite, this.sprite, () => this.tryOpen());
    });
  }

  tryOpen() {
    if (this.gameState.bossesDefeated !== 2) return;

    if (this.sprite.anims.getCurrentKey() !== OPENING_ANIM) {
      this.sprite.anims.play(OPENING_ANIM, true);
    }
    const sound = this.audio.get("jailDoorOpening");
    if (!sound.isPlaying) {
      sound.play();
    }
  }

  update() {
    if (this.sprite.anims.getCurrentKey() === OPENING_ANIM && this.sprite.anims.getProgress(OPENING_ANIM) === 1) {
      this.gameState.isEndgame = true;
      this.sprite.disableBody();
    }
  }
}
