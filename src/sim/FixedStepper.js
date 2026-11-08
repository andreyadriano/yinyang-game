export const STEP_MS = 1000 / 60;

// Runs the game logic in fixed steps of 1/60 s, whatever the frame rate: a 144 Hz screen skips
// steps and a slow phone runs several per frame (up to maxStepsPerFrame, then it drops time instead
// of spiralling). Arcade physics already steps at 60 Hz with the same delta, so both stay in sync.
// `tick` counts the steps done, and is what snapshots will use as a timestamp.
export class FixedStepper {
  constructor(stepMs = STEP_MS, maxStepsPerFrame = 5) {
    this.stepMs = stepMs;
    this.maxStepsPerFrame = maxStepsPerFrame;
    this.accumulator = 0;
    this.tick = 0;
  }

  advance(deltaMs, step) {
    this.accumulator += Math.min(deltaMs, this.stepMs * this.maxStepsPerFrame);
    while (this.accumulator >= this.stepMs) {
      step(this.stepMs);
      this.accumulator -= this.stepMs;
      this.tick += 1;
    }
  }
}
