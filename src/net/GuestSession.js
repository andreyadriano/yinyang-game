import { MSG, PROTOCOL_VERSION, hashIds, packIntent } from "./protocol.js";
import { applyDelta } from "./snapshotDelta.js";
import { SCENE_KEYS } from "../scenes/sceneKeys.js";

const STATE_EVERY_MS = 200; // where the local player is goes out when the intent changes, and 5 times a second while it moves (the host only needs it to fix drift)
const STILL_HEARTBEAT_MS = 2000; // and once in a while when nothing changes, so the host knows the guest is still there
const MAX_EXTRAPOLATE_MS = 150; // between snapshots a moving entity keeps going at its speed, but never for longer than this
const SMOOTHING_MS = 60; // how fast entities glide toward the position the host sent
const SNAP_DISTANCE = 160; // farther than this (a teleport) the entity jumps instead of gliding

// The guest does not run the game. It sends what its player presses, and draws what the host
// sends: each snapshot sets the state of the entities, and between snapshots they glide toward
// their new positions so the movement looks smooth.
export class GuestSession {
  constructor(scene, transport) {
    this.scene = scene;
    this.transport = transport;
    this.idsHash = hashIds(scene.entities.ids());
    this.base = null; // the last full snapshot, rebuilt from the deltas
    this.targets = new Map(); // id -> { state, at, moving }: the latest state, when it arrived and whether it was moving
    this.clockMs = 0;
    this.lastReport = null;
    this.seen = new Set();
    this.lastIntent = -1;
    this.sinceIntentMs = 0;
    this.finished = false;
    this.synced = false; // true after the first picture of the game arrived

    this.stopListening = [
      transport.onMessage((message) => this.onMessage(message)),
      transport.onClose(() => this.fail("connection-lost"))
    ];
    transport.send({ t: MSG.HELLO, protocol: PROTOCOL_VERSION, ids: this.idsHash });
  }

  onMessage(message) {
    if (this.finished) return;
    switch (message.t) {
      case MSG.HELLO:
        if (message.protocol !== PROTOCOL_VERSION || message.ids !== this.idsHash) this.fail("version-mismatch");
        break;
      case MSG.SNAPSHOT:
        this.onSnapshot(message);
        break;
      case MSG.EFFECT:
        this.scene.localPlayer.applyEffect(message);
        break;
      case MSG.SOUND:
        this.scene.audio.playQuiet(message.name, { volume: message.volume });
        break;
      case MSG.END:
        this.onEnd(message.result);
        break;
      case MSG.PEER_LEFT:
        this.fail("host-left");
        break;
      case MSG.ERROR:
        this.fail(message.code);
        break;
    }
  }

  onSnapshot(message) {
    this.base = applyDelta(this.base, message);
    const { scene } = this;
    scene.state.restore(this.base.game);
    if (this.base.game.isGameOver || this.base.game.isEndgame) scene.audio.get("music").stop();
    if (this.base.game.isGameOver) scene.localPlayer.forceDeath();

    for (const id of Object.keys(message.entities)) {
      const entity = scene.entities.get(id);
      if (!entity) continue;
      const state = this.base.entities[id];
      const comesBack = !entity.sprite.active;
      const isLocalPlayer = entity === scene.localPlayer;
      // The first time (and when it reappears) the entity is put in place; after that it glides.
      // The player of this device is not drawn from the host: it moves by itself (see GameScene.simulateGuest).
      if (isLocalPlayer && this.seen.has(id) && !comesBack) continue;
      // Entities that run their own animations (flamethrowers) are realigned by each full snapshot.
      const progress = message.full && entity.animatesItself === true;
      entity.setState(state, { position: !this.seen.has(id) || comesBack, progress });
      this.seen.add(id);
      if (!isLocalPlayer) {
        const changes = message.entities[id];
        const moving = message.full || changes.x !== undefined || changes.y !== undefined;
        this.targets.set(id, { state, at: this.clockMs, moving });
      }
    }
    this.synced = true;
  }

  // Called every frame.
  update(deltaMs) {
    if (this.finished) return;
    this.clockMs += deltaMs;
    this.sendIntent(deltaMs);
    this.glide(deltaMs);
  }

  // The intent goes out as soon as it changes, with where the local player is, so that the host
  // can keep the same player in the same place (see HostSession.followGuest).
  sendIntent(deltaMs) {
    this.sinceIntentMs += deltaMs;
    const intent = packIntent(this.scene.localInput.read());
    const changed = intent !== this.lastIntent;
    if (!changed && this.sinceIntentMs < STATE_EVERY_MS) return;

    const { sprite } = this.scene.localPlayer;
    const p = this.synced
      ? [Math.round(sprite.x * 10) / 10, Math.round(sprite.y * 10) / 10, Math.round(sprite.body.velocity.x), Math.round(sprite.body.velocity.y)]
      : undefined;
    // Standing still with nothing pressed: only the heartbeat.
    const still = p && this.lastReport && p.every((value, i) => value === this.lastReport[i]);
    if (!changed && still && this.sinceIntentMs < STILL_HEARTBEAT_MS) return;

    this.transport.send({ t: MSG.INTENT, n: intent, p });
    this.lastIntent = intent;
    this.lastReport = p ?? null;
    this.sinceIntentMs = 0;
  }

  // Between two snapshots the entities glide toward where the host put them. One that was moving
  // keeps going at its speed meanwhile, so a low snapshot rate still looks smooth.
  glide(deltaMs) {
    const amount = 1 - Math.exp(-deltaMs / SMOOTHING_MS);
    for (const [id, { state, at, moving }] of this.targets) {
      const sprite = this.scene.entities.get(id)?.sprite;
      if (!sprite?.active) continue;
      const age = moving && state.bodyEnabled ? Math.min(this.clockMs - at, MAX_EXTRAPOLATE_MS) / 1000 : 0;
      const targetX = state.x + state.vx * age;
      const targetY = state.y + state.vy * age;
      const dx = targetX - sprite.x;
      const dy = targetY - sprite.y;
      if (Math.abs(dx) + Math.abs(dy) > SNAP_DISTANCE) {
        sprite.setPosition(targetX, targetY);
      } else {
        sprite.setPosition(sprite.x + dx * amount, sprite.y + dy * amount);
      }
    }
  }

  // The host says how the run ended.
  onEnd(result) {
    if (result === "gameOver") this.leaveTo(SCENE_KEYS.GAME_OVER);
    else if (result === "endgame") this.leaveTo(SCENE_KEYS.CREDITS);
    else this.fail(result === "version-mismatch" ? "version-mismatch" : "host-left");
  }

  leaveTo(sceneKey) {
    this.finish();
    this.scene.physics.pause();
    this.scene.audio.get("music").stop();
    this.scene.scene.start(sceneKey);
  }

  // The run cannot go on (the host left, the connection dropped, the versions differ).
  fail(code) {
    if (this.finished) return;
    this.finish();
    this.scene.onlineStatus?.showError(code);
  }

  finish() {
    this.finished = true;
    this.stopListening.forEach((stop) => stop());
    this.transport.close();
  }

  stop() {
    if (!this.finished) this.finish();
  }
}
