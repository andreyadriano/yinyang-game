import { Room } from "./Room.js";
import { screenRequest } from "./guards.js";
import { rejectWith } from "./reject.js";

export { Room };

// The relay Worker for online co-op:
//   wss://<host>/room/ABC234[?role=host|guest]   the first player in a room is the host, the second the guest
//   https://<host>/health                        answers "ok"
//
// Requests are screened first (see guards.js), so abuse is stopped before a room is touched.
// Settings (allowed pages, the off switch, rate limits, room lifetime) are in wrangler.jsonc.
export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname === "/health") return new Response("ok");

    const screened = await screenRequest(request, env);
    if (!screened.ok) return screened.response ?? rejectWith(screened.rejectWith);

    return env.ROOMS.getByName(screened.code).fetch(request);
  }
};
