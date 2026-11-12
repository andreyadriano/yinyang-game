import { SCENE_KEYS } from "./sceneKeys.js";
import { enterFullscreen } from "../input/fullscreen.js";

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

    // Left thumb: run. Right thumb: attack at the corner, jump above it, crouch beside it (the
    // usual arc of a 2D action game). The right group is anchored to the right edge, because the
    // screen is wider than 800 on long phones.
    const edge = this.scale.width;
    this.addHoldButton("left", 74, 525, 56, "left");
    this.addHoldButton("right", 214, 525, 56, "right");
    this.addHoldButton("attack", edge - 84, 520, 64, "sword");
    this.addHoldButton("jump", edge - 96, 380, 56, "jump");
    this.addHoldButton("down", edge - 224, 540, 42, "down");

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
    const g = this.icons;
    const size = radius * 0.5;
    if (icon === "left") g.fillTriangle(x - size, y, x + size * 0.6, y - size, x + size * 0.6, y + size);
    if (icon === "right") g.fillTriangle(x + size, y, x - size * 0.6, y - size, x - size * 0.6, y + size);
    if (icon === "jump") this.drawArrow(g, x, y, radius * 0.62, -1);
    if (icon === "down") this.drawArrow(g, x, y, radius * 0.62, 1);
    if (icon === "sword") this.drawSword(g, x, y, radius * 0.78);
  }

  // A fat arrow pointing up (direction -1) or down (1): head and shaft.
  drawArrow(g, x, y, size, direction) {
    const tip = y + direction * size;
    const baseOfHead = y - direction * size * 0.05;
    g.fillTriangle(x, tip, x - size * 0.75, baseOfHead, x + size * 0.75, baseOfHead);
    g.fillRect(x - size * 0.22, Math.min(baseOfHead, y - direction * size), size * 0.44, size * 0.95);
  }

  // A sword with its tip toward the upper right: blade, guard, grip and pommel.
  drawSword(g, x, y, size) {
    const turn = Math.PI / 4;
    const point = (px, py) => ({
      x: x + (px * Math.cos(turn) - py * Math.sin(turn)) * size,
      y: y + (px * Math.sin(turn) + py * Math.cos(turn)) * size
    });
    g.fillPoints([point(0, -1.15), point(0.16, -0.1), point(-0.16, -0.1)], true);
    g.fillPoints([point(-0.45, -0.1), point(0.45, -0.1), point(0.45, 0.04), point(-0.45, 0.04)], true);
    g.fillPoints([point(-0.08, 0.04), point(0.08, 0.04), point(0.08, 0.5), point(-0.08, 0.5)], true);
    g.fillPoints([point(-0.16, 0.5), point(0.16, 0.5), point(0.16, 0.66), point(-0.16, 0.66)], true);
  }

  addSystemButtons() {
    // Pause: two bars. Fullscreen: a square outline (hidden where the browser has no fullscreen).
    const edge = this.scale.width; // the right edge of the screen
    if (this.allowPause) {
      const pause = this.add.rectangle(edge - 40, 40, 40, 40, 0xffffff, IDLE_ALPHA).setStrokeStyle(2, 0xffffff, 0.5);
      this.add.rectangle(edge - 48, 40, 6, 18, ICON_COLOR, 0.85);
      this.add.rectangle(edge - 32, 40, 6, 18, ICON_COLOR, 0.85);
      pause.setInteractive().on("pointerup", () => this.togglePause());
      this.buttons.pause = { x: edge - 40, y: 40, radius: 20 };
    }

    if (this.scale.fullscreen.available) {
      const fullscreen = this.add.rectangle(edge - 92, 40, 40, 40, 0xffffff, IDLE_ALPHA).setStrokeStyle(2, 0xffffff, 0.5);
      this.add.rectangle(edge - 92, 40, 18, 18).setStrokeStyle(3, ICON_COLOR, 0.85);
      fullscreen.setInteractive().on("pointerup", () => this.toggleFullscreen());
      this.buttons.fullscreen = { x: edge - 92, y: 40, radius: 20 };
    }

    this.pausedLabel = this.add
      .text(this.scale.width / 2, 300, "PAUSADO\ntoque em II para continuar", {
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
    if (this.scale.isFullscreen) this.scale.stopFullscreen();
    else enterFullscreen(this);
  }
}
