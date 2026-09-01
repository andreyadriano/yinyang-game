import { SCENE_KEYS } from "./sceneKeys.js";
export { GameOverScene };

class GameOverScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.GAME_OVER);
  }

  preload() {
    this.load.audio("youlose", "assets/sounds/sfx/you_lose.ogg");

    this.load.image("gameover", "assets/interface/gameover.png");
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
