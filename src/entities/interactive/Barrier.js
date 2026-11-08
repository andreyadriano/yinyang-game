const BARRIER_TYPES = {
  1: { idleKey: "barrier1Idle", openKey: "barrier1Open", requiredKey: "hasYellowKey" },
  2: { idleKey: "barrier2Idle", openKey: "barrier2Open", requiredKey: "hasBlueKey" }
};

function createAnimations(anims) {
  for (const type of Object.values(BARRIER_TYPES)) {
    if (anims.exists(type.idleKey)) continue;
    anims.create({
      key: type.idleKey,
      frames: anims.generateFrameNumbers(type.idleKey, { start: 0, end: 11 }),
      frameRate: 9,
      repeat: -1
    });
    anims.create({
      key: type.openKey,
      frames: anims.generateFrameNumbers(type.openKey, { start: 0, end: 6 }),
      frameRate: 7,
      repeat: 0
    });
  }
}

export class Barrier {
  constructor(scene, { x, y, type }, { gameState, groundLayers } = {}) {
    this.scene = scene;
    this.gameState = gameState;
    this.type = BARRIER_TYPES[type];
    this.isOpening = false;
    this.isOpen = false;

    createAnimations(scene.anims);

    this.sprite = scene.physics.add.sprite(x, y, this.type.idleKey).setScale(1.5, 2);
    this.sprite.setSize(20, 32).setOffset(6, 0);
    this.sprite.setBounce(0);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setImmovable(true);
    this.sprite.anims.play(this.type.idleKey);

    groundLayers.forEach((layer) => scene.physics.add.collider(this.sprite, layer));
  }

  // Called once the players exist: touching the barrier with the right key opens it.
  bindPlayers(players) {
    players.forEach((player) => {
      this.scene.physics.add.collider(player.sprite, this.sprite, () => this.tryOpen());
    });
  }

  tryOpen() {
    if (!this.isOpening && this.gameState[this.type.requiredKey]) {
      this.isOpening = true;
      this.gameState[this.type.requiredKey] = false;
      this.sprite.anims.play(this.type.openKey);
    }
  }

  update() {
    if (this.isOpening && !this.isOpen && this.sprite.anims.getProgress(this.type.openKey) === 1) {
      this.isOpen = true;
      this.sprite.disableBody(true, true);
    }
  }
}
