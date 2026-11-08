import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { WebSocketServer } from "ws";
import { MAX_MESSAGE_CHARS } from "../src/net/protocol.js";
import { RoomRegistry } from "../src/net/RoomCore.js";

// The relay server for online co-op, for development and tests: the same room rules that will run
// on Cloudflare (src/net/RoomCore.js), with Node connections around them.
//
//   node server/relay.js            listens on port 8787 (or PORT)
//   ws://localhost:8787/room/ABC234          the first player in a room is the host, the second the guest
//   ws://localhost:8787/room/ABC234?role=guest   (or role=host) asks for a role: a guest never creates a room
//   http://localhost:8787/health    answers "ok"
const HEARTBEAT_MS = 20_000;

export function startRelay({ port = 8787, limits } = {}) {
  const registry = new RoomRegistry(limits);

  const http = createServer((request, response) => {
    if (request.url === "/health") {
      response.writeHead(200, { "content-type": "text/plain" });
      response.end("ok");
    } else {
      response.writeHead(426, { "content-type": "text/plain" });
      response.end("This is a WebSocket server: connect to /room/ABCD");
    }
  });

  const wss = new WebSocketServer({ server: http, maxPayload: MAX_MESSAGE_CHARS * 4 });

  wss.on("connection", (socket, request) => {
    const url = new URL(request.url ?? "/", "http://relay");
    const code = url.pathname.match(/^\/room\/([^/]+)$/)?.[1] ?? "";
    const wanted = ["host", "guest"].includes(url.searchParams.get("role")) ? url.searchParams.get("role") : undefined;
    const peer = {
      send: (text) => socket.readyState === socket.OPEN && socket.send(text),
      close: (closeCode, reason) => socket.close(closeCode, reason),
      // Cut off now: close, and if the other side does not answer, drop the connection a moment later.
      closeNow: (closeCode, reason) => {
        socket.close(closeCode, reason);
        setTimeout(() => socket.terminate(), 1000).unref();
      }
    };

    const joined = registry.join(code, peer, wanted);
    if (!joined) return;

    socket.isAlive = true;
    socket.on("pong", () => (socket.isAlive = true));
    socket.on("message", (data) => joined.room.receive(peer, data.toString()));
    socket.on("close", () => registry.leave(joined.room, peer));
    socket.on("error", () => socket.close());
  });

  // Drops connections that stopped answering (a phone that lost signal, for example).
  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (!socket.isAlive) socket.terminate();
      else {
        socket.isAlive = false;
        socket.ping();
      }
    }
  }, HEARTBEAT_MS);

  return new Promise((resolve) => {
    http.listen(port, () => {
      resolve({
        port: http.address().port,
        registry,
        close: () =>
          new Promise((done) => {
            clearInterval(heartbeat);
            wss.clients.forEach((socket) => socket.terminate());
            wss.close(() => http.close(() => done()));
          })
      });
    });
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const { port } = await startRelay({ port: Number(process.env.PORT) || 8787 });
  console.log(`Relay listening on ws://localhost:${port}/room/ABCD`);
}
