import { DurableObject } from "cloudflare:workers";
import { RoomCore } from "../../src/net/RoomCore.js";
import { rejectWith } from "./reject.js";

const CLOSE_GRACE_MS = 2000;

// One game room: a Durable Object per room code. The rules (who is host, who is guest, what is
// relayed) are in RoomCore, which is the same code the local Node relay uses.
//
// The object uses the WebSocket Hibernation API, so it can be evicted from memory while the
// connections stay open (a host waiting alone for a friend sends nothing for a long time). When it
// wakes up its memory is empty, so the RoomCore is rebuilt from the open sockets, each of which
// remembers its role and room as an attachment.
export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.core = null;
    this.peers = new Map(); // socket -> peer the RoomCore talks to

    // Keepalive pings are answered by the runtime without waking the object.
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"t":"ping"}', '{"t":"pong"}'));
  }

  // The peer is what RoomCore sends to and compares by identity: one per socket.
  peerFor(socket) {
    let peer = this.peers.get(socket);
    if (!peer) {
      peer = {
        send: (text) => {
          try {
            socket.send(text);
          } catch {
            // the connection is already gone; its close event will clean up
          }
        },
        // The other player's client hangs up by itself when told they left (see WebSocketTransport), and
        // a close started here from another socket's event can leave it half-closed, so the server only
        // closes as a fallback, after a grace period.
        close: (code, reason) =>
          this.ctx.waitUntil(
            new Promise((resolve) =>
              setTimeout(() => {
                closeSocket(socket, code, reason);
                resolve();
              }, CLOSE_GRACE_MS)
            )
          )
      };
      this.peers.set(socket, peer);
    }
    return peer;
  }

  // The RoomCore, rebuilt from the open sockets if the object was asleep.
  getCore(code = "") {
    if (this.core) return this.core;

    const core = new RoomCore(code);
    for (const socket of this.ctx.getWebSockets()) {
      const info = socket.deserializeAttachment();
      if (!info) continue;
      core.code = info.room;
      if (info.role === "host") core.host = this.peerFor(socket);
      else core.guest = this.peerFor(socket);
    }
    this.core = core;
    return core;
  }

  async fetch(request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected a WebSocket connection", { status: 426 });
    }
    const code = new URL(request.url).pathname.match(/^\/room\/([^/?#]+)/)?.[1] ?? "";
    const core = this.getCore(code);

    // A third player is turned away before getting a socket that can hibernate.
    if (core.host && core.guest) return rejectWith("room-full");

    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);

    const role = core.join(this.peerFor(server));
    server.serializeAttachment({ role, room: code });

    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(socket, message) {
    if (typeof message !== "string") return; // the game only speaks text
    this.getCore().receive(this.peerFor(socket), message);
  }

  webSocketClose(socket, code, reason) {
    this.dropSocket(socket);
    closeSocket(socket, code, reason);
  }

  webSocketError(socket) {
    this.dropSocket(socket);
  }

  dropSocket(socket) {
    const peer = this.peers.get(socket);
    if (peer) this.getCore().leave(peer);
    this.peers.delete(socket);
  }
}

// 1005 and 1006 only describe what happened; they cannot be sent in a close frame.
function closeSocket(socket, code, reason) {
  try {
    socket.close(code === 1005 || code === 1006 || !code ? 1000 : code, reason);
  } catch {
    // already closed
  }
}
