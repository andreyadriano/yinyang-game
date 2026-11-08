import { decode, encode } from "./protocol.js";

// A transport carries messages between this device and the other player. Anything with these four
// methods is one (the game does not care whether it is a WebSocket, a test double, or later WebRTC):
//
//   send(message)         message is a plain object (see protocol.js)
//   onMessage(handler)    handler(message) for every message received; returns a function to stop
//   onClose(handler)      handler() once the connection is gone; returns a function to stop
//   close()
//
// LoopbackTransport links two ends inside the same page. Messages go through JSON like on a real
// network, and it can simulate latency, jitter and lost messages, so the online code can be
// tested without a server.
export class LoopbackTransport {
  // Returns [a, b]: what a sends, b receives, and the other way round.
  static pair(options = {}) {
    const a = new LoopbackTransport(options);
    const b = new LoopbackTransport(options);
    a.other = b;
    b.other = a;
    return [a, b];
  }

  constructor({ latencyMs = 0, jitterMs = 0, lossRate = 0, random = Math.random } = {}) {
    this.latencyMs = latencyMs;
    this.jitterMs = jitterMs;
    this.lossRate = lossRate;
    this.random = random;
    this.other = null;
    this.closed = false;
    this.messageHandlers = new Set();
    this.closeHandlers = new Set();
  }

  send(message) {
    if (this.closed || !this.other || this.other.closed) return;
    if (this.random() < this.lossRate) return;

    const text = encode(message);
    const delay = this.latencyMs + this.random() * this.jitterMs;
    const deliver = () => this.other.receive(text);
    if (delay > 0) setTimeout(deliver, delay);
    else queueMicrotask(deliver);
  }

  receive(text) {
    if (this.closed) return;
    const message = decode(text);
    if (message) [...this.messageHandlers].forEach((handler) => handler(message));
  }

  onMessage(handler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onClose(handler) {
    this.closeHandlers.add(handler);
    return () => this.closeHandlers.delete(handler);
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    [...this.closeHandlers].forEach((handler) => handler());
    this.other?.close();
  }
}
