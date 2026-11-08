import { DurableObject } from "cloudflare:workers";
import { RoomCore } from "../../src/net/RoomCore.js";
import { rejectWith } from "./reject.js";

const CLOSE_GRACE_MS = 2000;

// How long things may last, in milliseconds; each can be changed with a variable in wrangler.jsonc.
const DEFAULT_WAITING_MS = 10 * 60_000; // a host alone, waiting for a friend
const DEFAULT_MAX_ROOM_MS = 3 * 60 * 60_000; // the most a room may live, however busy
const DEFAULT_CHECK_MS = 60_000; // how often the room looks at its sockets

// One game room: a Durable Object per room code. The rules (who is host, who is guest, what is
// relayed, who is cut off) are in RoomCore, which is the same code the local Node relay uses.
//
// The object uses the WebSocket Hibernation API, so it can be evicted from memory while the
// connections stay open (a host waiting alone for a friend sends nothing for a long time). When it
// wakes up its memory is empty, so the RoomCore is rebuilt from the open sockets, each of which
// remembers its role, room and arrival time as an attachment.
//
// An alarm looks at the room now and then and closes rooms that waited too long for a friend or
// lived too long, so forgotten (or abusive) rooms do not pile up.
export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.core = null;
    this.peers = new Map(); // socket -> peer the RoomCore talks to
    this.waitingMs = Number(env.ROOM_WAITING_MS) || DEFAULT_WAITING_MS;
    this.maxRoomMs = Number(env.ROOM_MAX_MS) || DEFAULT_MAX_ROOM_MS;
    this.checkMs = Number(env.ROOM_CHECK_MS) || DEFAULT_CHECK_MS;

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
          ),
        // For a peer that is misbehaving and must be cut off now.
        closeNow: (code, reason) => closeSocket(socket, code, reason)
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
    const url = new URL(request.url);
    const code = url.pathname.match(/^\/room\/([^/?#]+)/)?.[1] ?? "";
    const wanted = url.searchParams.get("role");
    const core = this.getCore(code);

    // Turned away before getting a socket that can hibernate.
    if (wanted === "guest" && !core.host) return rejectWith("room-not-found");
    if (wanted === "host" && core.host) return rejectWith("room-in-use");
    if (core.isFull()) return rejectWith("room-full");

    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);

    const role = core.join(this.peerFor(server), wanted);
    server.serializeAttachment({ role, room: code, joinedAt: Date.now() });

    if ((await this.ctx.storage.getAlarm()) === null) {
      await this.ctx.storage.setAlarm(Date.now() + this.checkMs);
    }

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

  // Closes rooms where the host has waited too long alone, and rooms that have lived too long.
  async alarm() {
    const sockets = this.ctx.getWebSockets();
    if (sockets.length === 0) return;

    const core = this.getCore();
    const now = Date.now();
    for (const socket of sockets) {
      const info = socket.deserializeAttachment();
      if (!info) continue;
      const age = now - info.joinedAt;
      const aloneHost = info.role === "host" && !core.guest;
      if (age > (aloneHost ? this.waitingMs : this.maxRoomMs)) {
        core.expel(this.peerFor(socket), "room-timeout", 1000);
      }
    }

    if (this.ctx.getWebSockets().length > 0) await this.ctx.storage.setAlarm(now + this.checkMs);
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
