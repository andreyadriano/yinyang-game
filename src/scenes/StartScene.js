import { SCENE_KEYS } from "./sceneKeys.js";
export { StartScene };

class StartScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.START);
  }

  create() {
    this.add.image(400, 300, "Start");

    const startTheme = this.sound.add("starttheme");
    const playTheme = () => startTheme.play({ loop: true, volume: 0.3 });

    // Phones keep audio locked until the first touch, so the theme may have to wait for it.
    if (this.sound.locked) {
      this.sound.once("unlocked", playTheme);
    } else {
      playTheme();
    }

    // A single tap or click starts the game, even if that same tap is what unlocks the audio.
    this.input.once("pointerup", () => {
      this.sound.off("unlocked", playTheme);
      startTheme.stop();
      this.scene.start(SCENE_KEYS.GAME);
    });
  }
}
