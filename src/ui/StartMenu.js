import { RoomCodeInput, INVALID_CODE_MESSAGE, parseRoomCode } from "./RoomCodeInput.js";

// Layout, in game coordinates (x is relative to the horizontal center of the scene).
const TITLE_Y = 170;
const FIRST_BUTTON_Y = 250;
const BUTTON_GAP = 18;
const BUTTON_SIZE = { desktop: { width: 380, height: 64 }, touch: { width: 460, height: 78 } };
const NOTE_STYLE = { fontFamily: "sans-serif", fontSize: "16px", color: "#ffffff", align: "center" };

// Pages of the menu. A button is { name, label, action, enabled? }; `enabled(menu)` hides it when false.
const PAGES = {
  main: {
    title: "Escolha como jogar",
    back: null,
    buttons: [
      { name: "solo", label: "Solo", action: { start: { mode: "solo" } } },
      { name: "local", label: "Co-op local", action: { start: { mode: "local" } }, enabled: (menu) => !menu.touch },
      { name: "online", label: "Co-op online", action: { page: "online" } },
    ],
    note: (menu) => (menu.touch ? "Dois jogadores no mesmo aparelho só no computador." : ""),
  },
  online: {
    title: "Co-op online",
    back: "main",
    buttons: [
      { name: "host", label: "Criar sala", action: { start: { mode: "online", role: "host" } } },
      { name: "join", label: "Entrar em uma sala", action: { page: "join" } },
      { name: "back", label: "Voltar", action: { page: "main" } },
    ],
    note: () => "Quem cria a sala joga de Yin; o amigo entra pelo código ou pelo link.",
  },
  join: {
    title: "Código da sala",
    back: "online",
    input: true,
    buttons: [
      { name: "enter", label: "Entrar", action: { submit: true } },
      { name: "back", label: "Voltar", action: { page: "online" } },
    ],
    note: () => "Peça ao amigo que criou a sala o código de 6 letras e números.",
  },
};

// The mode menu of the start screen: Solo / Co-op local / Co-op online (create or join a room).
// Works with mouse, touch and keyboard (arrows + Enter, Esc to go back). `buttons` lists the buttons of the
// current page (name -> { x, y, width, height, label }) and `activate(name)` presses one; the tests use both.
// When a mode is picked, `onChoose(choice)` is called with what resolveGameMode() understands.
export class StartMenu {
  constructor(scene, { touch, onChoose }) {
    this.scene = scene;
    this.touch = touch;
    this.onChoose = onChoose;
    this.page = null;
    this.buttons = {};
    this.drawn = [];
    this.selected = 0;
    this.objects = [];
    this.codeInput = null;
    this.errorText = null;

    scene.input.keyboard.on("keydown", this.onKey, this);
    scene.events.once("shutdown", () => this.destroy());
    this.show("main");
  }

  show(pageName) {
    this.clear();
    this.page = pageName;
    this.selected = 0;
    const page = PAGES[pageName];
    const { width: sceneWidth, height: sceneHeight } = this.scene.scale;
    const cx = sceneWidth / 2;
    const size = this.touch ? BUTTON_SIZE.touch : BUTTON_SIZE.desktop;

    this.track(this.scene.add.rectangle(cx, sceneHeight / 2, sceneWidth, sceneHeight, 0x000000, 0.72).setDepth(1));
    this.track(
      this.scene.add
        .text(cx, TITLE_Y, page.title, { ...NOTE_STYLE, fontSize: "40px", fontStyle: "bold" })
        .setOrigin(0.5)
        .setDepth(2)
    );

    let y = FIRST_BUTTON_Y;
    if (page.input) {
      this.codeInput = new RoomCodeInput(
        this.scene,
        { x: cx, y: y + size.height / 2, width: size.width, height: size.height },
        { onSubmit: () => this.submit(), onCancel: () => this.show(page.back) }
      );
      y += size.height + BUTTON_GAP;
    }

    page.buttons
      .filter((button) => !button.enabled || button.enabled(this))
      .forEach((button) => {
        this.addButton(button, cx, y + size.height / 2, size);
        y += size.height + BUTTON_GAP;
      });

    // The note goes under the title on the page with the code box: below the buttons it would sit on
    // top of the "CLIQUE PARA JOGAR" that is part of the background picture.
    this.track(
      this.scene.add
        .text(cx, page.input ? TITLE_Y + 34 : y + 6, page.note(this), NOTE_STYLE)
        .setOrigin(0.5, 0)
        .setDepth(2)
    );
    this.errorText = this.track(
      this.scene.add
        .text(cx, y + 40, "", {
          ...NOTE_STYLE,
          color: "#ffb4a8",
          fontStyle: "bold",
          wordWrap: { width: size.width + 80 },
        })
        .setOrigin(0.5, 0)
        .setDepth(2)
    );
    this.draw();
    if (this.codeInput && !this.touch) this.codeInput.focus(); // on phones the keyboard opens when the box is tapped
  }

  addButton(button, x, y, size) {
    const graphics = this.track(this.scene.add.graphics().setDepth(2));
    this.track(
      this.scene.add
        .text(x, y, button.label, {
          fontFamily: "sans-serif",
          fontSize: this.touch ? "30px" : "26px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0.5)
        .setDepth(3)
    );
    const zone = this.track(
      this.scene.add.zone(x, y, size.width, size.height).setInteractive({ useHandCursor: true }).setDepth(3)
    );
    const index = this.drawn.length;
    this.drawn.push({ graphics, x, y, size });
    zone.on("pointerover", () => {
      this.selected = index;
      this.draw();
    });
    zone.on("pointerup", () => this.activate(button.name));
    this.buttons[button.name] = { x, y, width: size.width, height: size.height, label: button.label };
  }

  // Draws the rounded translucent buttons, the selected one brighter.
  draw() {
    this.drawn.forEach(({ graphics, x, y, size }, index) => {
      const selected = index === this.selected;
      const left = x - size.width / 2;
      const top = y - size.height / 2;
      graphics.clear();
      graphics.fillStyle(0xffffff, selected ? 0.4 : 0.18);
      graphics.fillRoundedRect(left, top, size.width, size.height, 18);
      graphics.lineStyle(3, 0xffffff, selected ? 0.9 : 0.5);
      graphics.strokeRoundedRect(left, top, size.width, size.height, 18);
    });
  }

  activate(name) {
    const button = PAGES[this.page]?.buttons.find((b) => b.name === name);
    if (!button || !this.buttons[name]) return;
    const { action } = button;
    if (action.page) this.show(action.page);
    else if (action.submit) this.submit();
    else if (action.start) this.onChoose(action.start);
  }

  // Joins the room typed in the box, or says why it cannot.
  submit() {
    const room = parseRoomCode(this.codeInput?.value);
    if (!room) {
      this.errorText.setText(INVALID_CODE_MESSAGE);
      return;
    }
    this.onChoose({ mode: "online", role: "guest", room });
  }

  onKey(event) {
    const count = this.drawn.length;
    if (event.key === "ArrowDown") this.selected = (this.selected + 1) % count;
    else if (event.key === "ArrowUp") this.selected = (this.selected - 1 + count) % count;
    else if (event.key === "Enter") this.activate(Object.keys(this.buttons)[this.selected]);
    else if (event.key === "Escape" && PAGES[this.page].back) this.show(PAGES[this.page].back);
    else return;
    this.draw();
  }

  track(object) {
    this.objects.push(object);
    return object;
  }

  clear() {
    this.codeInput?.destroy();
    this.codeInput = null;
    this.objects.forEach((object) => object.destroy());
    this.objects = [];
    this.buttons = {};
    this.drawn = [];
  }

  destroy() {
    this.scene.input.keyboard?.off("keydown", this.onKey, this);
    this.clear();
  }
}
