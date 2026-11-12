import { MSG, PROTOCOL_VERSION, hashIds, packIntent } from "./protocol.js";
import { applyDelta } from "./snapshotDelta.js";
import { SCENE_KEYS } from "../scenes/sceneKeys.js";

const STATE_EVERY_MS = 50; // the intent and where the local player is are sent when the intent changes and 20 times a second
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
    this.targets = new Map(); // id -> the latest state (where to glide to)
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
      entity.setState(state, { position: !this.seen.has(id) || comesBack, progress: false });
      this.seen.add(id);
      if (!isLocalPlayer) this.targets.set(id, state);
    }
    this.synced = true;
  }

  // Called every frame.
  update(deltaMs) {
    if (this.finished) return;
    this.sendIntent(deltaMs);
    this.glide(deltaMs);
  }

  // The intent goes out as soon as it changes, with where the local player is, so that the host
  // can keep the same player in the same place (see HostSession.followGuest).
  sendIntent(deltaMs) {
    this.sinceIntentMs += deltaMs;
    const intent = packIntent(this.scene.localInput.read());
    if (intent !== this.lastIntent || this.sinceIntentMs >= STATE_EVERY_MS) {
      const { sprite } = this.scene.localPlayer;
      const p = this.synced
        ? [Math.round(sprite.x * 10) / 10, Math.round(sprite.y * 10) / 10, Math.round(sprite.body.velocity.x), Math.round(sprite.body.velocity.y)]
        : undefined;
      this.transport.send({ t: MSG.INTENT, n: intent, p });
      this.lastIntent = intent;
      this.sinceIntentMs = 0;
    }
  }

  glide(deltaMs) {
    const amount = 1 - Math.exp(-deltaMs / SMOOTHING_MS);
    for (const [id, target] of this.targets) {
      const sprite = this.scene.entities.get(id)?.sprite;
      if (!sprite?.active) continue;
      const dx = target.x - sprite.x;
      const dy = target.y - sprite.y;
      if (Math.abs(dx) + Math.abs(dy) > SNAP_DISTANCE) {
        sprite.setPosition(target.x, target.y);
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
