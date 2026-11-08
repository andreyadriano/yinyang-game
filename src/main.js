import { GameScene } from "./scenes/GameScene.js";
import { StartScene } from "./scenes/StartScene.js";
import { GameOverScene } from "./scenes/GameOverScene.js";
import { CreditsScene } from "./scenes/CreditsScene.js";

const config = {
  type: Phaser.AUTO,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 800 },
      debug: false
    }
  },
  // Fullscreen support
  scale: {
    mode: Phaser.Scale.FIT,
    parent: "game",
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 800,
    height: 600
  },
  // Scenes, in sequence
  scene: [StartScene, GameScene, GameOverScene, CreditsScene]
};

const game = new Phaser.Game(config);

// Exposto para os testes automatizados (tests/smoke.spec.js).
window.__game = game;
