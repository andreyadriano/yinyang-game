// Animations shared by every player character. The key of each one is `${character}-${name}`
// (for example "yin-run"). `sheet: "run"` uses the separate run spritesheet `${character}run`;
// otherwise the main spritesheet named after the character is used.
export const PLAYER_CHARACTERS = ["yin", "yang"];

export const PLAYER_ANIMATIONS = {
  idle: { start: 38, end: 41, frameRate: 5, repeat: -1 },
  die: { start: 59, end: 68, frameRate: 5 },
  run: { sheet: "run", start: 0, end: 5, frameRate: 10, repeat: -1 },
  jump: { start: 14, end: 17, frameRate: 8 },
  fall: { start: 22, end: 23, frameRate: 5, repeat: -1 },
  crouch: { start: 4, end: 7, frameRate: 7, repeat: -1 },
  attack1: { start: 42, end: 46, frameRate: 20, delay: 100 },
  attack2: { start: 47, end: 52, frameRate: 20, delay: 100 },
  attack3: { start: 53, end: 58, frameRate: 20, delay: 100 },
  hurt: { start: 59, end: 61, frameRate: 9 }
};
