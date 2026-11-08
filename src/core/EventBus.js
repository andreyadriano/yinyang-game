// A tiny event emitter with no dependency on Phaser, so the game state can run (and be tested)
// anywhere. on() returns a function that removes the handler.
export class EventBus {
  constructor() {
    this.handlers = new Map();
  }

  on(name, handler) {
    if (!this.handlers.has(name)) this.handlers.set(name, new Set());
    this.handlers.get(name).add(handler);
    return () => this.off(name, handler);
  }

  off(name, handler) {
    this.handlers.get(name)?.delete(handler);
  }

  emit(name, data) {
    [...(this.handlers.get(name) ?? [])].forEach((handler) => handler(data));
  }
}
