import { SCENE_KEYS } from "./sceneKeys.js";
export { CreditsScene };

class CreditsScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.CREDITS);
  }

  preload() {
    this.load.image("creditsimage", "assets/interface/TelaFinal.png");
    this.load.audio("fim", "assets/sounds/bgm/ebunny_-_Life.mp3");
  }

  create() {
    this.add.image(400, 300, "creditsimage");
    this.fim = this.sound.add("fim");
    this.fim.play({
      loop: true,
      volume: 0.3
    });
  }
}
