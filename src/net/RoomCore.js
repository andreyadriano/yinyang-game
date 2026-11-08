import { MSG, ROOM_CODE_PATTERN, decode, encode, isGameMessage } from "./protocol.js";

// The rules of a room, with no network code in it: who is the host, who is the guest, and which
// messages are forwarded. The local relay server (server/relay.js) and, later, the Cloudflare
// Durable Object are thin wrappers that give it real connections.
//
// A "peer" is anything with send(text) and close(). Rules:
//   - the first peer in a room is the host, the second is the guest, a third is turned away;
//   - game messages from one peer go to the other one, never back to the sender;
//   - when the guest leaves the host is told and the room opens again;
//   - when the host leaves the guest is told and the room is closed.
export class RoomCore {
  constructor(code) {
    this.code = code;
    this.host = null;
    this.guest = null;
  }

  isEmpty() {
    return !this.host && !this.guest;
  }

  // Returns the role the peer got, or null when it was turned away.
  join(peer) {
    if (!this.host) {
      this.host = peer;
      peer.send(encode({ t: MSG.JOINED, role: "host", room: this.code }));
      return "host";
    }
    if (!this.guest) {
      this.guest = peer;
      peer.send(encode({ t: MSG.JOINED, role: "guest", room: this.code }));
      this.host.send(encode({ t: MSG.PEER_JOINED }));
      return "guest";
    }
    peer.send(encode({ t: MSG.ERROR, code: "room-full" }));
    peer.close(1008, "room-full");
    return null;
  }

  receive(peer, text) {
    const message = decode(text);
    if (!message || !isGameMessage(message)) {
      peer.send(encode({ t: MSG.ERROR, code: "bad-message" }));
      return;
    }
    const target = peer === this.host ? this.guest : peer === this.guest ? this.host : null;
    target?.send(text);
  }

  leave(peer) {
    if (peer === this.guest) {
      this.guest = null;
      this.host?.send(encode({ t: MSG.PEER_LEFT }));
    } else if (peer === this.host) {
      this.host = null;
      const guest = this.guest;
      this.guest = null;
      if (guest) {
        guest.send(encode({ t: MSG.PEER_LEFT }));
        guest.close(1000, "host-left");
      }
    }
  }
}

// All the rooms of a server, by code.
export class RoomRegistry {
  constructor() {
    this.rooms = new Map();
  }

  // Joins `peer` to the room `code`. Returns { room, role } or null when the code is not valid
  // (the peer is told and closed).
  join(code, peer) {
    if (!ROOM_CODE_PATTERN.test(code)) {
      peer.send(encode({ t: MSG.ERROR, code: "bad-room" }));
      peer.close(1008, "bad-room");
      return null;
    }
    let room = this.rooms.get(code);
    if (!room) {
      room = new RoomCore(code);
      this.rooms.set(code, room);
    }
    const role = room.join(peer);
    return role ? { room, role } : null;
  }

  leave(room, peer) {
    room.leave(peer);
    if (room.isEmpty()) this.rooms.delete(room.code);
  }
}
