// Input source driven by the on-screen buttons (see TouchControlsScene).
// It follows the same contract as KeyboardInput: read() returns the intent of the frame.
export class TouchInput {
  constructor() {
    this.state = this.emptyState();
  }

  emptyState() {
    return { left: false, right: false, up: false, down: false, attack: false };
  }

  press(action) {
    this.state[action] = true;
  }

  release(action) {
    this.state[action] = false;
  }

  reset() {
    this.state = this.emptyState();
  }

  read() {
    return { ...this.state };
  }
}
