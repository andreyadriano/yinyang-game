import { ROOM_CODE_PATTERN } from "../../src/net/protocol.js";
import { Room } from "./Room.js";
import { rejectWith } from "./reject.js";

export { Room };

// The relay Worker for online co-op:
//   wss://<host>/room/ABCD    the first player in a room is the host, the second the guest
//   https://<host>/health     answers "ok"
//
// Set ALLOWED_ORIGINS (comma separated, for example "https://yinyang.example.com") in
// wrangler.jsonc to accept connections only from your own pages. Empty means any origin.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") return new Response("ok");

    const match = url.pathname.match(/^\/room\/([^/?#]+)$/);
    if (!match) return new Response("Not found", { status: 404 });
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected a WebSocket connection", { status: 426 });
    }
    if (!originAllowed(request, env)) return new Response("Forbidden", { status: 403 });

    const code = match[1];
    // Rooms are created by name, so a bad code is turned away here, before any room exists.
    if (!ROOM_CODE_PATTERN.test(code)) return rejectWith("bad-room");

    return env.ROOMS.getByName(code).fetch(request);
  }
};

function originAllowed(request, env) {
  const allowed = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (allowed.length === 0) return true;
  return allowed.includes(request.headers.get("Origin") ?? "");
}
