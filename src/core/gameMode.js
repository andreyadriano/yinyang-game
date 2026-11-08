// A game mode says who plays on THIS device and how it is shown.
//
//   local - two players on one keyboard, split-screen (desktop)
//   solo  - one player per device, single camera (phones; also the base of online co-op,
//           where the second player is remote)
//
// The default depends on the device (touch -> solo, otherwise local). It can be forced with
// the URL: ?mode=solo or ?mode=local, and in solo mode ?character=yin or ?character=yang.
export const GAME_MODES = {
  local: { name: "local", characters: ["yin", "yang"], camera: "split" },
  solo: { name: "solo", characters: ["yin"], camera: "single" }
};

// True when the main pointer is a finger (phones and tablets), false for mouse + keyboard.
export function isTouchDevice() {
  return window.matchMedia("(pointer: coarse)").matches;
}

export function resolveGameMode(search = window.location.search, touch = isTouchDevice()) {
  const params = new URLSearchParams(search);
  const requested = params.get("mode");
  const name = requested in GAME_MODES ? requested : touch ? "solo" : "local";
  const base = GAME_MODES[name];

  const character = params.get("character");
  const characters = name === "solo" && ["yin", "yang"].includes(character) ? [character] : base.characters;

  return { ...base, characters, touch };
}
