import { SCENE_KEYS } from "./sceneKeys.js";
export { GameOverScene };

class GameOverScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.GAME_OVER);
  }

  create() {
    this.add.image(400, 300, "gameover");

    this.youlose = this.sound.add("youlose");

    this.youlose.play();

    this.cursors = this.input.keyboard.createCursorKeys();

    // After a moment (so a tap meant for the game does not skip this screen), a tap or Enter
    // goes back to the start screen to play again.
    this.time.delayedCall(1500, () => {
      const restart = () => this.scene.start(SCENE_KEYS.START);
      this.input.once("pointerup", restart);
      this.input.keyboard.once("keydown-ENTER", restart);
    });
  }

  update() {
    if (this.cursors.space.isDown) {
      this.youlose.play();
    }
  }
}
