import { SCENE_KEYS } from "../scenes/sceneKeys.js";

const MESSAGES = {
  "no-relay": "O modo online ainda não está disponível neste endereço",
  unreachable: "Não foi possível conectar ao servidor online",
  "bad-room": "Código de sala inválido",
  "room-full": "A sala já tem dois jogadores",
  "room-not-found": "Essa sala não existe. Peça um novo link ao amigo",
  "room-in-use": "Esse código de sala já está em uso",
  "version-mismatch": "Versões diferentes do jogo. Recarregue a página",
  "host-left": "O anfitrião saiu da partida",
  "connection-lost": "A conexão com o outro jogador caiu"
};

// The line of text at the top of the screen in online mode: the room code and who is connected.
// The host can tap it to share the invitation link; after an error, tapping goes back to the start screen.
export class OnlineStatus {
  constructor(scene, { role, room }) {
    this.scene = scene;
    this.role = role;
    this.room = room;
    this.error = false;

    this.text = scene.add
      .text(400, 8, "", {
        fontFamily: "sans-serif",
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "#000000aa",
        padding: { x: 10, y: 5 },
        align: "center"
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(1000)
      .setInteractive();
    this.text.on("pointerup", () => this.onTap());

    this.set(role === "host" ? `Sala ${room}: conectando...` : "Conectando à sala...");
  }

  set(message) {
    this.text.setText(message);
  }

  // The connection to the relay is up.
  setConnected() {
    this.set(this.role === "host" ? `Sala ${this.room}: toque para enviar o link ao amigo` : `Sala ${this.room}: conectado`);
  }

  // The other player came or left (host side).
  setPeer(connected) {
    if (this.error) return;
    this.set(connected ? `Sala ${this.room}: amigo conectado` : `Sala ${this.room}: toque para enviar o link ao amigo`);
  }

  showError(code) {
    this.error = true;
    this.set(`${MESSAGES[code] ?? "Erro de conexão"}\n(toque para voltar)`);
  }

  inviteLink() {
    const { origin, pathname, search } = window.location;
    const params = new URLSearchParams({ online: "join", room: this.room });
    const relay = new URLSearchParams(search).get("relay");
    if (relay) params.set("relay", relay);
    return `${origin}${pathname}?${params}`;
  }

  async onTap() {
    if (this.error) {
      this.scene.scene.start(SCENE_KEYS.START);
      return;
    }
    if (this.role !== "host") return;

    const link = this.inviteLink();
    try {
      if (navigator.share) {
        await navigator.share({ title: "Yin Yang", text: "Jogue comigo!", url: link });
      } else {
        await navigator.clipboard.writeText(link);
        this.set(`Sala ${this.room}: link copiado!`);
      }
    } catch {
      this.set(`Sala ${this.room}: ${link}`);
    }
  }
}
