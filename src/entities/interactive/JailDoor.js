import { GAME_EVENT } from "../../core/gameEvents.js";
import { applySpriteState, getSpriteState } from "../../sim/spriteState.js";

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

  // The state that changes while playing, as JSON (see src/sim/snapshot.js).
  getState() {
    return getSpriteState(this.sprite);
  }

  setState(state, options) {
    applySpriteState(this.sprite, state, options);
  }

  tryOpen() {
    if (!this.gameState.allBossesDefeated()) return;

    if (this.sprite.anims.getName() !== OPENING_ANIM) {
      this.sprite.anims.play(OPENING_ANIM, true);
      this.gameState.events.emit(GAME_EVENT.JAIL_DOOR_OPENED, {});
    }
    if (!this.audio.isPlaying("jailDoorOpening")) {
      this.audio.play("jailDoorOpening");
    }
  }

  update() {
    if (this.sprite.anims.getName() === OPENING_ANIM && this.sprite.anims.getProgress(OPENING_ANIM) === 1) {
      this.gameState.endGame();
      this.sprite.disableBody();
    }
  }
}
