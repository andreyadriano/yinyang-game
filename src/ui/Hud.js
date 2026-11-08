import { MAX_SOUL_COUNT } from "../core/GameState.js";

// The shared health ("soul") icon in the corner of the screen.
export class Hud {
  constructor(scene) {
    this.soulIcon = scene.add.image(20, 20, "soul").setOrigin(0.5).setScrollFactor(0).setScale(1.5);
  }

  update(soulCount) {
    if (soulCount > 0 && soulCount <= MAX_SOUL_COUNT) {
      this.soulIcon.setFrame(soulCount);
    }
  }
}
