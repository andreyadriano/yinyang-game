import { getSpriteState, applySpriteState } from "./spriteState.js";

export { getSpriteState, applySpriteState };

export const SNAPSHOT_VERSION = 1;

// A photo of the whole game as plain JSON: the shared game state plus the state of every
// registered entity (players, enemies, keys, barriers, ...). `tick` is the simulation step.
// JSON.stringify(snapshot) is what the host will send to the guest (online co-op).
export function takeSnapshot(scene) {
  return {
    version: SNAPSHOT_VERSION,
    tick: scene.stepper.tick,
    game: scene.state.toJSON(),
    entities: scene.entities.getStates()
  };
}

// Puts the game back as it was in the snapshot.
export function applySnapshot(scene, snapshot) {
  if (snapshot.version !== SNAPSHOT_VERSION) {
    throw new Error(`Unsupported snapshot version: ${snapshot.version}`);
  }
  scene.state.restore(snapshot.game);
  scene.entities.setStates(snapshot.entities);
  scene.stepper.tick = snapshot.tick;
}
