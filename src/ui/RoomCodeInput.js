import { ROOM_CODE_LENGTH, ROOM_CODE_PATTERN } from "../net/protocol.js";

export const INVALID_CODE_MESSAGE = "Código inválido: são 6 letras e números (sem I, L, O, 0 e 1)";

// Turns what was typed into a room code, or null when it is not a valid one (lowercase is accepted).
export function parseRoomCode(text) {
  const code = String(text ?? "")
    .trim()
    .toUpperCase();
  return ROOM_CODE_PATTERN.test(code) ? code : null;
}

// While the game is in full screen the browser draws only that element and what is inside it, so the
// input has to live there (and not in <body>) or it would be invisible on a phone.
const hostElement = () => document.fullscreenElement ?? document.body;

// A real HTML <input> laid over the canvas, so phones open their on-screen keyboard.
// `box` is { x, y, width, height } in game coordinates; the input follows the canvas when it is resized.
export class RoomCodeInput {
  constructor(scene, box, { onSubmit, onCancel }) {
    this.scene = scene;
    this.box = box;

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = ROOM_CODE_LENGTH;
    input.placeholder = "CÓDIGO";
    input.setAttribute("autocapitalize", "characters");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("inputmode", "text");
    input.setAttribute("enterkeyhint", "go");
    input.setAttribute("aria-label", "Código da sala");
    input.dataset.testid = "room-code";
    Object.assign(input.style, {
      position: "fixed",
      zIndex: "10",
      boxSizing: "border-box",
      textAlign: "center",
      textTransform: "uppercase",
      letterSpacing: "0.3em",
      fontFamily: "sans-serif",
      fontWeight: "bold",
      color: "#ffffff",
      background: "rgba(0, 0, 0, 0.6)",
      border: "3px solid rgba(255, 255, 255, 0.6)",
      borderRadius: "14px",
      outline: "none",
      userSelect: "text",
      touchAction: "manipulation",
    });
    input.addEventListener("input", () => {
      input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    });
    input.addEventListener("keydown", (event) => {
      event.stopPropagation(); // the scene's keyboard (arrows, Enter) must not react to typing
      if (event.key === "Enter") onSubmit(input.value);
      if (event.key === "Escape") onCancel();
    });

    this.element = input;
    this.reposition = () => this.place();
    hostElement().appendChild(input);
    this.place();
    scene.scale.on("resize", this.reposition);
    window.addEventListener("resize", this.reposition);
    // Entering or leaving full screen: move the input to where the browser is drawing.
    this.onFullscreenChange = () => {
      const focused = document.activeElement === input;
      hostElement().appendChild(input);
      this.place();
      if (focused) input.focus();
    };
    document.addEventListener("fullscreenchange", this.onFullscreenChange);
  }

  get value() {
    return this.element.value;
  }

  focus() {
    this.element.focus();
  }

  place() {
    const canvas = this.scene.game.canvas.getBoundingClientRect();
    const { width } = this.scene.scale;
    const k = canvas.width / width;
    const { x, y, width: w, height: h } = this.box;
    Object.assign(this.element.style, {
      left: `${canvas.left + (x - w / 2) * k}px`,
      top: `${canvas.top + (y - h / 2) * k}px`,
      width: `${w * k}px`,
      height: `${h * k}px`,
      fontSize: `${h * k * 0.5}px`,
    });
  }

  destroy() {
    this.scene.scale.off("resize", this.reposition);
    window.removeEventListener("resize", this.reposition);
    document.removeEventListener("fullscreenchange", this.onFullscreenChange);
    this.element.remove();
  }
}
