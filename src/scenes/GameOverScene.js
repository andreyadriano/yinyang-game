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
  }

  update() {
    if (this.cursors.space.isDown) {
      this.youlose.play();
    }
  }
}
