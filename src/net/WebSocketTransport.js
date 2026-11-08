import { MSG, decode, encode } from "./protocol.js";

const KEEPALIVE_MS = 25_000; // proxies drop connections that stay silent for too long (a host waiting alone, for example)

// A transport (see Transport.js) over a WebSocket, which is how the game talks to the relay server.
// Messages that arrive before anyone is listening (the server greets you the moment you connect)
// are kept and handed to the first listener.
export class WebSocketTransport {
  // Connects to `url` and resolves once the connection is open (rejects on error or timeout).
  static connect(url, { timeoutMs = 8000 } = {}) {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url);
      const transport = new WebSocketTransport(socket);
      const timer = setTimeout(() => {
        socket.close();
        reject(new Error(`Could not connect to ${url} in ${timeoutMs} ms`));
      }, timeoutMs);

      socket.addEventListener("open", () => {
        clearTimeout(timer);
        resolve(transport);
      });
      socket.addEventListener("error", () => {
        clearTimeout(timer);
        reject(new Error(`Could not connect to ${url}`));
      });
    });
  }

  constructor(socket, { keepaliveMs = KEEPALIVE_MS } = {}) {
    this.socket = socket;
    this.messageHandlers = new Set();
    this.closeHandlers = new Set();
    this.backlog = [];
    this.role = null; // "host" or "guest", from the relay's "joined"

    this.keepalive = setInterval(() => this.send({ t: MSG.PING }), keepaliveMs);

    socket.addEventListener("message", (event) => {
      const message = decode(event.data);
      if (!message || message.t === MSG.PONG) return;
      if (message.t === MSG.JOINED) this.role = message.role;

      if (this.messageHandlers.size === 0) this.backlog.push(message);
      else [...this.messageHandlers].forEach((handler) => handler(message));

      // When the host leaves the room is over for the guest: hang up from our side too, instead of
      // waiting for the server to close the connection.
      if (message.t === MSG.PEER_LEFT && this.role === "guest") this.close();
    });
    socket.addEventListener("close", () => {
      clearInterval(this.keepalive);
      [...this.closeHandlers].forEach((handler) => handler());
    });
  }

  send(message) {
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(encode(message));
  }

  onMessage(handler) {
    this.messageHandlers.add(handler);
    if (this.backlog.length > 0) {
      const waiting = this.backlog;
      this.backlog = [];
      waiting.forEach((message) => handler(message));
    }
    return () => this.messageHandlers.delete(handler);
  }

  onClose(handler) {
    this.closeHandlers.add(handler);
    return () => this.closeHandlers.delete(handler);
  }

  close() {
    clearInterval(this.keepalive);
    this.socket.close();
  }
}
