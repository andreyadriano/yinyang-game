// Input source for a player who is on another device: it plays back the intent that device last
// sent. It follows the same contract as KeyboardInput and TouchInput (read() returns the intent).
export class NetworkInput {
  constructor() {
    this.intent = { left: false, right: false, up: false, down: false, attack: false };
  }

  set(intent) {
    this.intent = { ...intent };
  }

  // Nothing pressed (used while the other player is not connected).
  clear() {
    this.set({ left: false, right: false, up: false, down: false, attack: false });
  }

  read() {
    return { ...this.intent };
  }
}
