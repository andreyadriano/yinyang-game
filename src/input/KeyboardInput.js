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

// The two local keyboard schemes: arrows + Enter for the first player, WASD + Space for the second.
export function createKeyboardInputs(scene) {
  const { KeyCodes } = Phaser.Input.Keyboard;
  const arrows = scene.input.keyboard.createCursorKeys();
  const key = (code) => scene.input.keyboard.addKey(code);

  return [
    new KeyboardInput({
      up: arrows.up,
      down: arrows.down,
      left: arrows.left,
      right: arrows.right,
      attack: key(KeyCodes.ENTER)
    }),
    new KeyboardInput({
      up: key(KeyCodes.W),
      down: key(KeyCodes.S),
      left: key(KeyCodes.A),
      right: key(KeyCodes.D),
      attack: arrows.space
    })
  ];
}
