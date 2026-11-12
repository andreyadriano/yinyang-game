import { SCENE_KEYS } from "./sceneKeys.js";
export { CreditsScene };

class CreditsScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.CREDITS);
  }

  create() {
    this.add.image(this.scale.width / 2, 300, "creditsimage");
    this.fim = this.sound.add("fim");
    this.fim.play({
      loop: true,
      volume: 0.3
    });
  }
}
