import { PreloadScene } from "./scenes/PreloadScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { StartScene } from "./scenes/StartScene.js";
import { GameOverScene } from "./scenes/GameOverScene.js";
import { CreditsScene } from "./scenes/CreditsScene.js";
import { TouchControlsScene } from "./scenes/TouchControlsScene.js";
import { resolveGameMode } from "./core/gameMode.js";
import { computeGameSize } from "./core/screenSize.js";

// On a phone the proportion of the whole screen is used (the game goes to full screen on the first tap);
// elsewhere, the proportion of the window.
const mode = resolveGameMode();
const { width, height } = computeGameSize(
  mode,
  mode.touch ? { width: screen.width, height: screen.height } : { width: window.innerWidth, height: window.innerHeight }
);

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
    width,
    height
  },
  // Scenes, in sequence
  scene: [PreloadScene, StartScene, GameScene, GameOverScene, CreditsScene, TouchControlsScene]
};

const game = new Phaser.Game(config);

// Exposto para os testes automatizados (tests/smoke.spec.js).
window.__game = game;
