import { MSG } from "./protocol.js";
import { WebSocketTransport } from "./WebSocketTransport.js";
import { getTurnstileToken } from "./turnstile.js";

// Connects to a room on the relay and checks that you got the role you wanted. Resolves with the
// transport, ready for a session; rejects with an Error whose message is a code:
//   "no-relay"        there is no relay server configured for this address
//   "unreachable"     the relay did not answer
//   "bad-room"        the room code is not valid
//   "room-full"       two players are already in the room
//   "room-not-found"  you asked to join a room that does not exist (nobody is hosting it)
//   "room-in-use"     you asked to host a room that already exists
//   "challenge-unavailable"  the Turnstile script did not load (an ad blocker, for example)
//   "challenge-failed"       the Turnstile challenge failed, or the server did not accept the token
// (the server checks the role you ask for; the check here is a second line of defence)
export async function connectOnline({ role, room, relayUrl, turnstileSiteKey }) {
  if (!relayUrl) throw new Error("no-relay");

  // With Turnstile on, each connection carries a fresh token (they are single use).
  const params = new URLSearchParams({ role });
  if (turnstileSiteKey) params.set("ts", await getTurnstileToken(turnstileSiteKey));

  let transport;
  try {
    transport = await WebSocketTransport.connect(`${relayUrl}/room/${room}?${params}`);
  } catch {
    throw new Error("unreachable");
  }

  const first = await new Promise((resolve) => {
    const stopMessages = transport.onMessage((message) => {
      stopMessages();
      stopClose();
      resolve(message);
    });
    const stopClose = transport.onClose(() => resolve({ t: MSG.ERROR, code: "unreachable" }));
  });

  if (first.t === MSG.ERROR) {
    transport.close();
    throw new Error(first.code);
  }
  if (first.t !== MSG.JOINED || first.role !== role) {
    transport.close();
    throw new Error(role === "guest" ? "room-not-found" : "room-in-use");
  }
  return transport;
}
