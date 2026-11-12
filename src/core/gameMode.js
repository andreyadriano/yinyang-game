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

// `place` is the page's location ({ hostname, origin }), a parameter so the tests can pretend to be anywhere.
// True when the URL already says how to play (?online=host|join or ?mode=solo|local): the start menu is skipped.
export function urlDefinesMode(search = window.location.search) {
  const params = new URLSearchParams(search);
  return ["host", "join"].includes(params.get("online")) || params.get("mode") in GAME_MODES;
}

// `choice` is what the player picked in the start menu: { mode: "solo" | "local" } or
// { mode: "online", role: "host" | "guest", room? }. The URL wins when it defines the mode, so invitation
// links keep working; with no choice and no URL the device decides (touch -> solo, otherwise local).
export function resolveGameMode(
  search = window.location.search,
  touch = isTouchDevice(),
  place = window.location,
  choice = null
) {
  const params = new URLSearchParams(search);
  if (choice && !urlDefinesMode(search)) {
    if (choice.mode === "online") {
      params.set("online", choice.role === "guest" ? "join" : "host");
      if (choice.room) params.set("room", choice.room);
    } else if (choice.mode in GAME_MODES) {
      params.set("mode", choice.mode);
    }
  }

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
      online: { role, room, relayUrl: getRelayUrl(search, place), turnstileSiteKey: getTurnstileSiteKey(search) }
    };
  }

  const requestedMode = params.get("mode");
  const name = requestedMode in GAME_MODES ? requestedMode : touch ? "solo" : "local";
  const base = GAME_MODES[name];

  const character = params.get("character");
  const characters = name === "solo" && ["yin", "yang"].includes(character) ? [character] : base.characters;

  return { ...base, characters, touch };
}
