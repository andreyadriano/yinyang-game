export const GAME_HEIGHT = 600;
export const MIN_GAME_WIDTH = 800; // the original 4:3 view
export const MAX_GAME_WIDTH = 1400; // about 21:9; beyond that the screen gets thin black bars again

// The size of the game's canvas. The split screen (two players on one keyboard) is 4:3. With one
// player per device the game is as wide as the screen is: the height stays 600 and the width follows
// the proportion of the window (always read as landscape, so rotating the phone later still fits),
// so the phone shows more of the level to the sides instead of black bars.
export function computeGameSize(mode, windowSize = { width: window.innerWidth, height: window.innerHeight }) {
  if (mode.camera === "split") return { width: MIN_GAME_WIDTH, height: GAME_HEIGHT };

  const long = Math.max(windowSize.width, windowSize.height);
  const short = Math.max(1, Math.min(windowSize.width, windowSize.height));
  const wanted = Math.round((GAME_HEIGHT * long) / short / 2) * 2;
  return { width: Math.min(MAX_GAME_WIDTH, Math.max(MIN_GAME_WIDTH, wanted)), height: GAME_HEIGHT };
}
