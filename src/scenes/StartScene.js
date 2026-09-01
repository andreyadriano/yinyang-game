import { SCENE_KEYS } from "./sceneKeys.js";
export { StartScene };

class StartScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.START);
  }

  preload() {
    this.load.audio("starttheme", ["assets/sounds/bgm/MenuMusic.mp3"]);

    this.load.image("Start", "assets/interface/start.png");
  }

  create() {
    this.add.image(400, 300, "Start");

    const startTheme = this.sound.add("starttheme");

    startTheme.play({
      loop: true,
      volume: 0.3
    });

    if (this.sound.locked) {
      this.sound.once("unlocked", () => this.setupSceneInput(startTheme));
    } else {
      this.setupSceneInput(startTheme);
    }
  }

  setupSceneInput(startTheme) {
    this.input.once("pointerup", () => {
      startTheme.stop();
      this.scene.start(SCENE_KEYS.GAME);
    });
  }
}
