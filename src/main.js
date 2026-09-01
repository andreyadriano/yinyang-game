import { GameScene } from "./scenes/GameScene.js";
import { StartScene } from "./scenes/StartScene.js";
import { GameOverScene } from "./scenes/GameOverScene.js";
import { CreditsScene } from "./scenes/CreditsScene.js";

var config = {
  type: Phaser.AUTO,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 800 },
      debug: false
    }
  },
  // Suporte a tela cheia
  scale: {
    mode: Phaser.Scale.FIT,
    parent: "game",
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 800,
    height: 600
  },
  // VÃÂ¡rias cenas, em sequÃÂªncia
  scene: [StartScene, GameScene, GameOverScene, CreditsScene]
};

var game = new Phaser.Game(config);
