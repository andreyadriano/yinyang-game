import { SCENE_KEYS } from "./sceneKeys.js";
import { isTouchDevice, urlDefinesMode } from "../core/gameMode.js";
import { enterFullscreen } from "../input/fullscreen.js";
import { StartMenu } from "../ui/StartMenu.js";
export { StartScene };

class StartScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.START);
  }

  create() {
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2, "Start");
    this.menu = null;

    const startTheme = this.sound.add("starttheme");
    const playTheme = () => startTheme.play({ loop: true, volume: 0.3 });

    // Phones keep audio locked until the first touch, so the theme may have to wait for it.
    if (this.sound.locked) {
      this.sound.once("unlocked", playTheme);
    } else {
      playTheme();
    }

    const startGame = (choice = null) => {
      this.sound.off("unlocked", playTheme);
      startTheme.stop();
      this.scene.start(SCENE_KEYS.GAME, { choice });
    };

    // The first tap or click (which also unlocks the audio and, on touch devices, asks for fullscreen) opens the
    // mode menu. When the URL already says how to play (invitation link, ?mode=...) the game starts at once.
    this.input.once("pointerup", () => {
      if (isTouchDevice()) enterFullscreen(this);
      if (urlDefinesMode()) {
        startGame();
        return;
      }
      this.menu = new StartMenu(this, { touch: isTouchDevice(), onChoose: startGame });
    });
  }
}
