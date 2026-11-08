import { getRelayUrl, getTurnstileSiteKey } from "../net/config.js";
import { generateRoomCode } from "../net/protocol.js";

// A game mode says who plays on THIS device and how it is shown.
//
//   local  - two players on one keyboard, split-screen (desktop)
//   solo   - one player per device, single camera (phones; also the base of online co-op)
//   online - co-op on two devices: one local player and one remote player, single camera.
//            The host (?online=host) runs the game and plays Yin; the guest (?online=join&room=ABCD)
//            only shows what the host sends and plays Yang.
//
// The default depends on the device (touch -> solo, otherwise local). It can be forced with the
// URL: ?mode=solo or ?mode=local (and ?character=yin|yang in solo), or ?online=host / ?online=join&room=ABCD
// (and ?relay=ws://... to use another relay server).
export const GAME_MODES = {
  local: { name: "local", characters: ["yin", "yang"], camera: "split" },
  solo: { name: "solo", characters: ["yin"], camera: "single" }
};

// True when the main pointer is a finger (phones and tablets), false for mouse + keyboard.
export function isTouchDevice() {
  return window.matchMedia("(pointer: coarse)").matches;
}

// The room a host opens; it stays the same for the whole page, so restarting a game keeps the link valid.
let hostRoom = null;

export function resolveGameMode(
  search = window.location.search,
  touch = isTouchDevice(),
  hostname = window.location.hostname
) {
  const params = new URLSearchParams(search);

  const online = params.get("online");
  if (online === "host" || online === "join") {
    const role = online === "host" ? "host" : "guest";
    const requested = (params.get("room") ?? "").toUpperCase();
    hostRoom ??= generateRoomCode();
    const room = requested || (role === "host" ? hostRoom : "");
    return {
      name: "online",
      characters: ["yin", "yang"],
      localCharacter: role === "host" ? "yin" : "yang",
      camera: "single",
      touch,
      online: { role, room, relayUrl: getRelayUrl(search, hostname), turnstileSiteKey: getTurnstileSiteKey(search) }
    };
  }

  const requestedMode = params.get("mode");
  const name = requestedMode in GAME_MODES ? requestedMode : touch ? "solo" : "local";
  const base = GAME_MODES[name];

  const character = params.get("character");
  const characters = name === "solo" && ["yin", "yang"].includes(character) ? [character] : base.characters;

  return { ...base, characters, touch };
}
