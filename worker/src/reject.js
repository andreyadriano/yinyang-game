import { MSG, encode } from "../../src/net/protocol.js";

// Accepts a WebSocket just to say why it is being turned away ("bad-room", "room-full"), then
// closes it. It uses the plain WebSocket API on purpose: a socket closed before the response is
// returned does not go through the hibernation machinery.
export function rejectWith(code) {
  const { 0: client, 1: server } = new WebSocketPair();
  server.accept();
  server.send(encode({ t: MSG.ERROR, code }));
  server.close(1008, code);
  return new Response(null, { status: 101, webSocket: client });
}
