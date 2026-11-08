import { MSG } from "./protocol.js";
import { WebSocketTransport } from "./WebSocketTransport.js";

// Connects to a room on the relay and checks that you got the role you wanted. Resolves with the
// transport, ready for a session; rejects with an Error whose message is a code:
//   "no-relay"        there is no relay server configured for this address
//   "unreachable"     the relay did not answer
//   "bad-room"        the room code is not valid
//   "room-full"       two players are already in the room
//   "room-not-found"  you asked to join a room that does not exist (nobody is hosting it)
//   "room-in-use"     you asked to host a room that already exists
export async function connectOnline({ role, room, relayUrl }) {
  if (!relayUrl) throw new Error("no-relay");

  let transport;
  try {
    transport = await WebSocketTransport.connect(`${relayUrl}/room/${room}`);
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
