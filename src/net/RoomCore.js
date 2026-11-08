import { MSG, ROOM_CODE_PATTERN, decode, encode, isGameMessage } from "./protocol.js";
import { TokenBucket } from "./RateLimiter.js";

// The rules of a room, with no network code in it: who is the host, who is the guest, which messages
// are forwarded, and who is thrown out for misbehaving. The local relay server (server/relay.js) and
// the Cloudflare Durable Object (worker/src/Room.js) are thin wrappers that give it real connections.
//
// A "peer" is anything with send(text) and close(code, reason); if it also has closeNow(code, reason)
// that is used to cut a misbehaving peer off right away. Rules:
//   - the first peer in a room is the host, the second is the guest, a third is turned away;
//   - a peer can say which role it wants ("host" or "guest"): asking to be the guest of a room with no
//     host, or the host of a room that already has one, is refused instead of creating a new room;
//   - game messages from one peer go to the other one, never back to the sender;
//   - a peer that sends too many messages, or keeps sending invalid ones, is expelled: told why, cut off,
//     and taken out of the room at once (the other player is told it left) without waiting for the
//     connection to finish closing;
//   - when the guest leaves the host is told and the room opens again;
//   - when the host leaves the guest is told and the room is closed.
export const DEFAULT_LIMITS = {
  messagesPerSecond: 60, // sustained; the game sends about 20 to 30 a second
  burst: 150,
  maxStrikes: 5 // invalid messages allowed before the peer is disconnected
};

export class RoomCore {
  constructor(code, { now = Date.now, ...limits } = {}) {
    this.code = code;
    this.host = null;
    this.guest = null;
    this.now = now;
    this.limits = { ...DEFAULT_LIMITS, ...limits };
    this.buckets = new Map();
    this.strikes = new Map();
    this.cutOff = new Set();
  }

  isEmpty() {
    return !this.host && !this.guest;
  }

  isFull() {
    return Boolean(this.host && this.guest);
  }

  // Returns the role the peer got, or null when it was turned away (it is told why).
  join(peer, wanted) {
    if (wanted === "guest" && !this.host) return this.refuse(peer, "room-not-found");
    if (wanted === "host" && this.host) return this.refuse(peer, "room-in-use");

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
    return this.refuse(peer, "room-full");
  }

  refuse(peer, code) {
    peer.send(encode({ t: MSG.ERROR, code }));
    peer.close(1008, code);
    return null;
  }

  receive(peer, text) {
    if (this.cutOff.has(peer)) return;

    if (!this.bucketFor(peer).take()) {
      this.expel(peer, "rate-limit");
      return;
    }

    const message = decode(text);
    if (message?.t === MSG.PING) return; // keepalive: nothing to do
    if (!message || !isGameMessage(message)) {
      peer.send(encode({ t: MSG.ERROR, code: "bad-message" }));
      const strikes = (this.strikes.get(peer) ?? 0) + 1;
      this.strikes.set(peer, strikes);
      if (strikes >= this.limits.maxStrikes) this.expel(peer, "bad-message");
      return;
    }

    const target = peer === this.host ? this.guest : peer === this.guest ? this.host : null;
    target?.send(text);
  }

  bucketFor(peer) {
    let bucket = this.buckets.get(peer);
    if (!bucket) {
      bucket = new TokenBucket({
        capacity: this.limits.burst,
        refillPerSecond: this.limits.messagesPerSecond,
        now: this.now
      });
      this.buckets.set(peer, bucket);
    }
    return bucket;
  }

  // Tells the peer why, cuts it off and takes it out of the room right away. Whatever it still sends
  // is ignored. `closeCode` is the WebSocket close code (1008 means "policy violation").
  expel(peer, code, closeCode = 1008) {
    this.cutOff.add(peer);
    peer.send(encode({ t: MSG.ERROR, code }));
    (peer.closeNow ?? peer.close).call(peer, closeCode, code);
    this.detach(peer);
  }

  // The peer's connection is gone.
  leave(peer) {
    this.buckets.delete(peer);
    this.strikes.delete(peer);
    this.cutOff.delete(peer);
    this.detach(peer);
  }

  // Takes the peer out of its seat and tells the other player (does nothing if it has no seat).
  detach(peer) {
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
  constructor(options = {}) {
    this.rooms = new Map();
    this.options = options;
  }

  // Joins `peer` to the room `code` as `wanted` ("host", "guest" or nothing). Returns { room, role },
  // or null when the peer was turned away (it is told why and closed).
  join(code, peer, wanted) {
    const refuse = (reason) => {
      peer.send(encode({ t: MSG.ERROR, code: reason }));
      peer.close(1008, reason);
      return null;
    };

    if (!ROOM_CODE_PATTERN.test(code)) return refuse("bad-room");

    let room = this.rooms.get(code);
    if (!room) {
      if (wanted === "guest") return refuse("room-not-found"); // joining never creates a room
      room = new RoomCore(code, this.options);
      this.rooms.set(code, room);
    }
    const role = room.join(peer, wanted);
    return role ? { room, role } : null;
  }

  leave(room, peer) {
    room.leave(peer);
    if (room.isEmpty()) this.rooms.delete(room.code);
  }
}
