// An input source gives the Player its intent for the current frame.
//
// Intent shape: { left, right, up, down, attack } (all booleans, true while held).
// The Player never reads keys directly; keyboard, touch and network sources only
// have to implement read() and return this shape.
export class KeyboardInput {
  // `keys` maps each action to a Phaser Key: { up, down, left, right, attack }.
  constructor(keys) {
    this.keys = keys;
  }

  read() {
    const { left, right, up, down, attack } = this.keys;
    return {
      left: left.isDown,
      right: right.isDown,
      up: up.isDown,
      down: down.isDown,
      attack: attack.isDown
    };
  }
}
