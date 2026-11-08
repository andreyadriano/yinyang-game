import { SCENE_KEYS } from "./sceneKeys.js";
import { ASSETS } from "../data/assets.js";
import { loadAssets } from "../core/loadAssets.js";
import { createPlayerAnimations } from "../entities/player/playerAnimations.js";

// Loads every asset once (with a progress bar), creates the animations that are
// shared by the whole game, then opens the start screen.
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.PRELOAD);
  }

  preload() {
    this.createProgressBar();
    loadAssets(this.load, ASSETS);
  }

  create() {
    createPlayerAnimations(this.anims);
    this.scene.start(SCENE_KEYS.START);
  }

  createProgressBar() {
    const { width, height } = this.scale;
    const barWidth = 400;
    const x = (width - barWidth) / 2;
    const y = height / 2;

    this.add.rectangle(width / 2, y, barWidth + 8, 24).setStrokeStyle(2, 0xffffff);
    const bar = this.add.rectangle(x, y, 0, 16, 0xffffff).setOrigin(0, 0.5);
    this.load.on("progress", (value) => {
      bar.width = barWidth * value;
    });
  }
}
