import { PLAYER_ANIMATIONS, PLAYER_CHARACTERS } from "../../data/playerAnimations.js";

// Creates every player animation for the given characters (once; existing keys are skipped).
export function createPlayerAnimations(anims, characters = PLAYER_CHARACTERS) {
  for (const character of characters) {
    for (const [name, definition] of Object.entries(PLAYER_ANIMATIONS)) {
      const key = `${character}-${name}`;
      if (anims.exists(key)) continue;

      const texture = definition.sheet === "run" ? `${character}run` : character;
      anims.create({
        key,
        frames: anims.generateFrameNumbers(texture, { start: definition.start, end: definition.end }),
        frameRate: definition.frameRate,
        repeat: definition.repeat ?? 0,
        ...(definition.delay && { delay: definition.delay })
      });
    }
  }
}
