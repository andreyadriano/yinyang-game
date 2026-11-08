// The messages two players (and the relay server) exchange. Everything is a JSON object with a
// type in `t`. The relay only forwards the "game" messages and never looks inside them.
//
// Relay -> client:
//   { t: "joined", role: "host" | "guest", room }   you are in the room
//   { t: "peer-joined" }                             the other player arrived
//   { t: "peer-left" }                               the other player left
//   { t: "error", code }                             "room-full", "bad-room", "bad-message"
//
// Game messages, forwarded to the other player:
//   { t: "hello", protocol, ids }          first message of each side; `ids` identifies the level data
//   { t: "intent", n }                     guest -> host: what the guest is pressing (see packIntent)
//   { t: "snapshot", full, tick, game?, entities }   host -> guest: the game (see snapshotDelta.js)
//   { t: "sound", name, volume? }          host -> guest: play a sound effect
//   { t: "end", result }                   host -> guest: the run is over ("gameOver" or "endgame")
export const PROTOCOL_VERSION = 1;
export const MAX_MESSAGE_CHARS = 64 * 1024;

export const MSG = {
  JOINED: "joined",
  PEER_JOINED: "peer-joined",
  PEER_LEFT: "peer-left",
  ERROR: "error",
  HELLO: "hello",
  INTENT: "intent",
  SNAPSHOT: "snapshot",
  SOUND: "sound",
  END: "end"
};

const GAME_MESSAGES = new Set([MSG.HELLO, MSG.INTENT, MSG.SNAPSHOT, MSG.SOUND, MSG.END]);

export function encode(message) {
  return JSON.stringify(message);
}

// Returns the message, or null when the text is not a JSON object with a string type, or too big.
export function decode(text) {
  if (typeof text !== "string" || text.length > MAX_MESSAGE_CHARS) return null;
  try {
    const message = JSON.parse(text);
    return message && typeof message === "object" && typeof message.t === "string" ? message : null;
  } catch {
    return null;
  }
}

// True for the messages the relay forwards between the two players.
export function isGameMessage(message) {
  return GAME_MESSAGES.has(message.t);
}

// Room codes are four capital letters, without the ones that look alike (I, L, O).
export const ROOM_CODE_PATTERN = /^[A-HJKMNP-Z]{4}$/;
const ROOM_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateRoomCode(random = Math.random) {
  let code = "";
  for (let i = 0; i < 4; i++) code += ROOM_ALPHABET[Math.floor(random() * ROOM_ALPHABET.length)];
  return code;
}

// A short fingerprint of the entity ids of a level. The two players compare it in "hello": if the
// level data differs (different versions of the game) the ids would not match and the game stops.
export function hashIds(ids) {
  let hash = 5381;
  for (const char of ids.join(",")) hash = ((hash << 5) + hash + char.charCodeAt(0)) >>> 0;
  return hash.toString(36);
}

// An intent ({ left, right, up, down, attack }) travels as one small number.
const INTENT_BITS = { left: 1, right: 2, up: 4, down: 8, attack: 16 };

export function packIntent(intent) {
  let n = 0;
  for (const [action, bit] of Object.entries(INTENT_BITS)) if (intent[action]) n |= bit;
  return n;
}

export function unpackIntent(n) {
  const intent = {};
  for (const [action, bit] of Object.entries(INTENT_BITS)) intent[action] = (n & bit) !== 0;
  return intent;
}
