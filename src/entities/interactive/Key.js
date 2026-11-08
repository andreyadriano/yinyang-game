const KEY_TYPES = {
  yellow: { texture: "yellowKey", animKey: "yellowKeySpin", lastFrame: 6, frameRate: 7, stateFlag: "hasYellowKey" },
  blue: { texture: "blueKey", animKey: "blueKeySpin", lastFrame: 9, frameRate: 9, stateFlag: "hasBlueKey" }
};

function createAnimations(anims) {
  for (const type of Object.values(KEY_TYPES)) {
    if (anims.exists(type.animKey)) continue;
    anims.create({
      key: type.animKey,
      frames: anims.generateFrameNumbers(type.texture, { start: 0, end: type.lastFrame }),
      frameRate: type.frameRate,
      repeat: -1
    });
  }
}

export class Key {
  constructor(scene, { x, y, type }, { gameState, audio, groundLayers } = {}) {
    this.scene = scene;
    this.gameState = gameState;
    this.audio = audio;
    this.type = KEY_TYPES[type];

    createAnimations(scene.anims);

    this.sprite = scene.physics.add.sprite(x, y, this.type.texture);
    this.sprite.setBounce(0);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setImmovable(true);
    this.sprite.setSize(20, 20);
    this.sprite.anims.play(this.type.animKey);

    groundLayers.forEach((layer) => scene.physics.add.collider(this.sprite, layer));
  }

  // Called once the players exist: touching the key picks it up.
  bindPlayers(players) {
    players.forEach((player) => {
      this.scene.physics.add.overlap(player.sprite, this.sprite, () => this.collect());
    });
  }

  collect() {
    this.gameState[this.type.stateFlag] = true;
    this.audio.get("keyPickup").play();
    this.sprite.disableBody(true, true);
  }
}
