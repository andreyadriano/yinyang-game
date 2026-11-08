import { SCENE_KEYS } from "./sceneKeys.js";

const IDLE_ALPHA = 0.18;
const PRESSED_ALPHA = 0.45;
const ICON_COLOR = 0xffffff;

// On-screen controls for touch devices, drawn by a scene of its own so they stay fixed on screen
// whatever the game cameras do. Launched by GameScene next to it; it feeds a TouchInput.
// Several fingers work at once (for example run right while jumping).
export class TouchControlsScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.TOUCH_CONTROLS);
  }

  // allowPause is false online: pausing the host would freeze the other player's game.
  init({ gameScene, touchInput, allowPause = true }) {
    this.gameScene = gameScene;
    this.touchInput = touchInput;
    this.allowPause = allowPause;
    this.buttons = {}; // name -> { x, y, radius }, also used by the tests
    this.isPaused = false;
  }

  create() {
    this.input.addPointer(3); // up to 5 fingers
    this.icons = this.add.graphics().fillStyle(ICON_COLOR, 0.85);

    // Left thumb: move and crouch
    this.addHoldButton("left", 62, 535, 46, "left");
    this.addHoldButton("right", 182, 535, 46, "right");
    this.addHoldButton("down", 122, 445, 36, "down");

    // Right thumb: jump and attack
    this.addHoldButton("jump", 640, 440, 46, "up");
    this.addHoldButton("attack", 730, 535, 56, "attack");

    this.addSystemButtons();

    this.events.once("shutdown", () => this.touchInput.reset());
  }

  // A round button that keeps `action` pressed while a finger is on it.
  addHoldButton(name, x, y, radius, icon) {
    const action = name === "jump" ? "up" : name;
    const circle = this.add.circle(x, y, radius, 0xffffff, IDLE_ALPHA).setStrokeStyle(3, 0xffffff, 0.5);
    circle.setInteractive();
    this.drawIcon(icon, x, y, radius);

    const press = () => {
      this.touchInput.press(action);
      circle.setFillStyle(0xffffff, PRESSED_ALPHA);
    };
    const release = () => {
      this.touchInput.release(action);
      circle.setFillStyle(0xffffff, IDLE_ALPHA);
    };

    circle.on("pointerdown", press);
    circle.on("pointerover", (pointer) => pointer.isDown && press()); // sliding from another button
    circle.on("pointerup", release);
    circle.on("pointerout", release);
    circle.on("pointerupoutside", release);

    this.buttons[name] = { x, y, radius };
  }

  drawIcon(icon, x, y, radius) {
    const size = radius * 0.5;
    const g = this.icons;
    if (icon === "left") g.fillTriangle(x - size, y, x + size * 0.6, y - size, x + size * 0.6, y + size);
    if (icon === "right") g.fillTriangle(x + size, y, x - size * 0.6, y - size, x - size * 0.6, y + size);
    if (icon === "up") g.fillTriangle(x, y - size, x - size, y + size * 0.6, x + size, y + size * 0.6);
    if (icon === "down") g.fillTriangle(x, y + size, x - size, y - size * 0.6, x + size, y - size * 0.6);
    if (icon === "attack") {
      this.add.text(x, y, "ATACAR", { fontFamily: "sans-serif", fontSize: "18px", fontStyle: "bold", color: "#ffffff" })
        .setOrigin(0.5)
        .setAlpha(0.85);
    }
  }

  addSystemButtons() {
    // Pause: two bars. Fullscreen: a square outline (hidden where the browser has no fullscreen).
    if (this.allowPause) {
      const pause = this.add.rectangle(760, 40, 40, 40, 0xffffff, IDLE_ALPHA).setStrokeStyle(2, 0xffffff, 0.5);
      this.add.rectangle(752, 40, 6, 18, ICON_COLOR, 0.85);
      this.add.rectangle(768, 40, 6, 18, ICON_COLOR, 0.85);
      pause.setInteractive().on("pointerup", () => this.togglePause());
      this.buttons.pause = { x: 760, y: 40, radius: 20 };
    }

    if (this.scale.fullscreen.available) {
      const fullscreen = this.add.rectangle(708, 40, 40, 40, 0xffffff, IDLE_ALPHA).setStrokeStyle(2, 0xffffff, 0.5);
      this.add.rectangle(708, 40, 18, 18).setStrokeStyle(3, ICON_COLOR, 0.85);
      fullscreen.setInteractive().on("pointerup", () => this.toggleFullscreen());
      this.buttons.fullscreen = { x: 708, y: 40, radius: 20 };
    }

    this.pausedLabel = this.add
      .text(400, 300, "PAUSADO\ntoque em II para continuar", {
        fontFamily: "sans-serif",
        fontSize: "28px",
        color: "#ffffff",
        align: "center",
        backgroundColor: "#000000aa",
        padding: { x: 20, y: 12 }
      })
      .setOrigin(0.5)
      .setVisible(false);
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    this.touchInput.reset();
    this.pausedLabel.setVisible(this.isPaused);
    if (this.isPaused) {
      this.gameScene.scene.pause();
      this.sound.pauseAll();
    } else {
      this.gameScene.scene.resume();
      this.sound.resumeAll();
    }
  }

  toggleFullscreen() {
    if (this.scale.isFullscreen) {
      this.scale.stopFullscreen();
    } else {
      this.scale.startFullscreen();
      // Where supported, lock to landscape once fullscreen (ignored elsewhere).
      screen.orientation?.lock?.("landscape").catch(() => {});
    }
  }
}
