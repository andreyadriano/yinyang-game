import { MSG, PROTOCOL_VERSION, hashIds, unpackIntent } from "./protocol.js";
import { diffSnapshot, quantizeSnapshot } from "./snapshotDelta.js";
import { takeSnapshot } from "../sim/snapshot.js";

const SNAPSHOT_EVERY_TICKS = 3; // 20 snapshots per second at 60 steps per second
const KEYFRAME_EVERY_SNAPSHOTS = 100; // a full snapshot every 5 seconds, to resynchronize

// The host runs the whole game. This session adds the other player: it plays back the guest's
// intent on the remote player, sends the guest the changes of the game 20 times a second, and
// forwards the sound effects. It never waits for the guest.
export class HostSession {
  constructor(scene, transport) {
    this.scene = scene;
    this.transport = transport;
    this.idsHash = hashIds(scene.entities.ids());
    this.peerReady = false;
    this.lastSent = null;
    this.snapshotsSent = 0;

    this.stopListening = [
      transport.onMessage((message) => this.onMessage(message)),
      transport.onClose(() => this.dropPeer()),
      scene.audio.events.on("play", ({ name, volume }) => {
        if (this.peerReady) transport.send({ t: MSG.SOUND, name, volume });
      })
    ];
  }

  onMessage(message) {
    switch (message.t) {
      case MSG.PEER_JOINED:
        this.transport.send({ t: MSG.HELLO, protocol: PROTOCOL_VERSION, ids: this.idsHash });
        break;
      case MSG.HELLO:
        this.onHello(message);
        break;
      case MSG.PEER_LEFT:
        this.dropPeer();
        break;
      case MSG.INTENT:
        if (this.peerReady) this.scene.remoteInput.set(unpackIntent(message.n));
        break;
    }
  }

  onHello(message) {
    if (message.protocol !== PROTOCOL_VERSION || message.ids !== this.idsHash) {
      this.transport.send({ t: MSG.END, result: "version-mismatch" });
      this.dropPeer();
      return;
    }
    this.peerReady = true;
    this.lastSent = null; // the next snapshot is a full one
    this.snapshotsSent = 0;
    this.scene.setRemotePlayerPresent(true);
    this.scene.onlineStatus?.setPeer(true);
  }

  dropPeer() {
    this.peerReady = false;
    this.scene.remoteInput.clear();
    this.scene.setRemotePlayerPresent(false);
    this.scene.onlineStatus?.setPeer(false);
  }

  // Called after every simulation step.
  afterStep(tick) {
    if (this.peerReady && tick % SNAPSHOT_EVERY_TICKS === 0) this.sendSnapshot();
  }

  sendSnapshot() {
    if (this.snapshotsSent % KEYFRAME_EVERY_SNAPSHOTS === 0) this.lastSent = null;
    const snapshot = quantizeSnapshot(takeSnapshot(this.scene));
    this.transport.send({ t: MSG.SNAPSHOT, ...diffSnapshot(this.lastSent, snapshot) });
    this.lastSent = snapshot;
    this.snapshotsSent += 1;
  }

  // The host is leaving the scene: tell the guest how the run ended and hang up.
  stop() {
    this.stopListening.forEach((stop) => stop());
    const { isEndgame, isGameOver } = this.scene.state;
    const result = isEndgame ? "endgame" : isGameOver ? "gameOver" : "left";
    this.transport.send({ t: MSG.END, result });
    this.transport.close();
  }
}
