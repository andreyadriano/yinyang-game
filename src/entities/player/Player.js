import { SCENE_KEYS } from "../../scenes/sceneKeys.js";
import { GAME_EVENT } from "../../core/gameEvents.js";
import { applySpriteState, getSpriteState } from "../../sim/spriteState.js";

const JUMP_BUFFER_MS = 333; // ~20 frames at 60fps, kept as a time-based buffer instead of a frame count
const JUMP_VELOCITY = -350;
const MOVE_SPEED = 300;

// Physics body sizes: setSize(width, height, true) followed by setOffset(offsetX, offsetY).
const HITBOX = {
  standing: { width: 13, height: 25, offsetX: 18, offsetY: 10 },
  crouching: { width: 13, height: 20, offsetX: 18, offsetY: 15 },
  attackRight: { width: 15, height: 30, offsetX: 25, offsetY: 5 },
  attackLeft: { width: 15, height: 30, offsetX: 10, offsetY: 5 }
};

// FREE covers idle, run, jump, fall and crouch (they are derived from the intent and the physics every frame).
// The other states lock the player until their animation ends.
const STATE = { FREE: "free", ATTACK: "attack", HURT: "hurt", DIE: "die" };

const ATTACK_ANIMS = ["attack1", "attack2", "attack3"];

// Why the end of an animation is polled in update() instead of using the animationcomplete event:
// the Phaser step advances animations, then runs physics (where enemies see the player attacking),
// then runs the scene update. Polling keeps the last frame visible to physics exactly once,
// which the original gameplay timing relies on. A stopped animation also counts as finished,
// so a skipped last frame at a low frame rate cannot lock the player in a state.

export class Player {
  // `character` is both the texture key and the animation prefix ("yin" or "yang"); the id is
  // "player-yin" or "player-yang", the same on every device.
  // `input` is an input source (see KeyboardInput): it returns the intent for each frame.
  // `events` is the game event bus (gameState.events).
  constructor(scene, { character, x, y, input, groundLayers, audio, events } = {}) {
    this.scene = scene;
    this.id = `player-${character}`;
    this.character = character;
    this.input = input;
    this.audio = audio;
    this.events = events;

    this.facing = "right";
    this.state = STATE.FREE;
    this.attackCombo = 0;
    this.isJumping = false;
    this.jumpBufferMs = 0;
    // Online, the host plays the other player's sounds for itself only: that player's own device
    // already played them (see sfx).
    this.announceSounds = true;
    // Online, the host sets this on the player of the other device: it receives what the host's
    // game does to that player (a hit, a portal, a jumper), to be played back on that device.
    this.onEffect = null;

    this.sprite = scene.physics.add.sprite(x, y, character);
    this.setHitbox(HITBOX.standing);
    this.sprite.setBounce(0);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setData("owner", this);

    groundLayers.forEach((layer) => {
      scene.physics.add.collider(this.sprite, layer);
    });
  }

  anim(name) {
    return `${this.character}-${name}`;
  }

  isPlayingAnim(name) {
    return this.sprite.anims.getName() === this.anim(name);
  }

  isAnimFinished() {
    const anims = this.sprite.anims;
    return anims.getProgress() === 1 || !anims.isPlaying;
  }

  isAttacking() {
    return this.state === STATE.ATTACK;
  }

  isDead() {
    return this.state === STATE.DIE;
  }

  // Plays a sound effect; announced to the other device unless this player belongs to it.
  sfx(name, config) {
    if (this.announceSounds) this.audio.play(name, config);
    else this.audio.playQuiet(name, config);
  }

  // Pushed back by an enemy or hazard: sets velocity and plays the hurt animation.
  takeHit(velocityX, velocityY) {
    if (this.isDead()) return;
    this.applyHit(velocityX, velocityY);
    this.events?.emit(GAME_EVENT.PLAYER_HIT, { id: this.id });
    this.onEffect?.({ k: "hit", vx: velocityX, vy: velocityY });
  }

  applyHit(velocityX, velocityY) {
    this.sprite.setVelocityX(velocityX);
    this.sprite.setVelocityY(velocityY);
    this.hurt();
  }

  // Touching spikes: red flash, hurt animation from the start and a bounce upward.
  takeSpikeHit(bounceVelocityY) {
    this.sprite.setTint(0xff0000);
    if (this.isDead()) return;
    this.applySpikeHit(bounceVelocityY);
    this.onEffect?.({ k: "spike", vy: bounceVelocityY });
  }

  applySpikeHit(bounceVelocityY) {
    this.sprite.setTint(0xff0000);
    this.hurt({ restart: true });
    this.sprite.setVelocityY(bounceVelocityY);
  }

  // Portals move the player to another place.
  warp(x, y) {
    this.sprite.setPosition(x, y);
    this.onEffect?.({ k: "warp", x, y });
  }

  // Jumpers throw the player up (a negative velocity).
  launch(velocityY) {
    this.sprite.setVelocityY(velocityY);
    this.onEffect?.({ k: "launch", vy: velocityY });
  }

  // On the device of this player (online guest): plays back what the host's game did to it.
  applyEffect(effect) {
    switch (effect.k) {
      case "hit":
        if (!this.isDead()) this.applyHit(effect.vx, effect.vy);
        break;
      case "spike":
        if (!this.isDead()) this.applySpikeHit(effect.vy);
        break;
      case "warp":
        this.sprite.body.reset(effect.x, effect.y);
        break;
      case "launch":
        this.sprite.setVelocityY(effect.vy);
        break;
    }
  }

  // Enters the hurt state. With `restart`, the animation starts over even if it is already playing.
  hurt({ restart = false } = {}) {
    if (this.isDead()) return;
    this.state = STATE.HURT;
    this.sprite.anims.play(this.anim("hurt"), !restart);
  }

  // The state that changes while playing, as JSON (see src/sim/snapshot.js).
  getState() {
    return {
      ...getSpriteState(this.sprite),
      facing: this.facing,
      state: this.state,
      attackCombo: this.attackCombo,
      isJumping: this.isJumping,
      jumpBufferMs: this.jumpBufferMs
    };
  }

  setState(state, options) {
    applySpriteState(this.sprite, state, options);
    this.facing = state.facing;
    this.state = state.state;
    this.attackCombo = state.attackCombo;
    this.isJumping = state.isJumping;
    this.jumpBufferMs = state.jumpBufferMs;
  }

  // Online, the other player is hidden until they connect (and when they leave).
  appearAt(x, y) {
    this.sprite.enableBody(true, x, y, true, true);
    this.sprite.clearTint();
    this.state = STATE.FREE;
    this.attackCombo = 0;
    this.sprite.anims.play(this.anim("idle"), true);
  }

  disappear() {
    this.sprite.disableBody(true, true);
  }

  forceDeath() {
    if (this.isDead()) return;
    this.state = STATE.DIE;
    this.sprite.anims.play(this.anim("die"));
  }

  update(time, delta) {
    const intent = this.input.read();

    if (this.isJumping) {
      this.jumpBufferMs += delta;
    }

    if (this.isPlayingAnim("idle")) {
      this.setHitbox(HITBOX.standing);
    }

    switch (this.state) {
      case STATE.DIE:
        this.updateDying();
        break;
      case STATE.HURT:
        this.updateHurt();
        break;
      case STATE.ATTACK:
        this.updateAttack();
        break;
      default:
        this.updateFree(intent);
    }
  }

  updateDying() {
    if (this.isAnimFinished()) {
      this.scene.physics.pause();
      this.scene.scene.start(SCENE_KEYS.GAME_OVER);
    } else {
      this.sprite.setVelocity(0, 0);
    }
  }

  updateHurt() {
    if (this.isAnimFinished()) {
      this.sprite.clearTint();
      this.state = STATE.FREE;
      this.sprite.anims.play(this.anim("idle"), true);
    } else {
      this.sprite.setTint(0xff0000);
    }
  }

  updateAttack() {
    if (this.isAnimFinished()) {
      this.state = STATE.FREE;
      this.sprite.anims.play(this.anim("idle"), true);
    } else {
      this.setHitbox(this.facing === "right" ? HITBOX.attackRight : HITBOX.attackLeft);
    }
  }

  // Free movement. Branches are ordered by priority: the first one that applies wins.
  updateFree(intent) {
    const body = this.sprite.body;
    const onGround = body.blocked.down;

    if (intent.up && onGround) {
      this.jump();
    } else if (!onGround && intent.up && this.isJumping && this.jumpBufferMs >= JUMP_BUFFER_MS) {
      this.doubleJump();
    } else if (intent.attack && !intent.down && onGround) {
      this.startAttack();
    } else if (body.velocity.y < 0) {
      this.moveInAir(intent, "jump");
    } else if (!onGround && body.velocity.y > 0) {
      this.moveInAir(intent, "fall");
    } else if (onGround) {
      this.moveOnGround(intent);
    }
  }

  jump() {
    this.sprite.setVelocityY(JUMP_VELOCITY);
    this.sfx("jump", { volume: 0.3 });
    this.isJumping = true;
  }

  doubleJump() {
    this.sprite.setVelocityY(JUMP_VELOCITY);
    this.sfx("jump", { volume: 0.3 });
    this.isJumping = false;
    this.jumpBufferMs = 0;
  }

  // Three-hit combo: each press starts the next attack, and the third one resets the combo.
  startAttack() {
    this.state = STATE.ATTACK;
    this.sprite.setFlipX(this.facing === "left");
    this.sprite.setVelocityX(0);
    this.sprite.anims.play(this.anim(ATTACK_ANIMS[this.attackCombo]), true);
    this.sfx("swordWoosh", { volume: 0.3 });
    this.attackCombo = (this.attackCombo + 1) % ATTACK_ANIMS.length;
  }

  // Airborne: keep moving horizontally with the intent (left wins over right) and play `animName`.
  moveInAir(intent, animName) {
    this.steer(intent);
    this.sprite.anims.play(this.anim(animName), true);
    this.attackCombo = 0;
  }

  moveOnGround(intent) {
    if (intent.left || intent.right) {
      this.steer(intent);
      this.sprite.anims.play(this.anim("run"), true);
      this.attackCombo = 0;
    } else if (intent.down && !intent.attack) {
      this.crouch();
    } else if (!intent.down && !intent.attack) {
      this.sprite.setFlipX(this.facing === "left");
      this.sprite.setVelocityX(0);
      this.sprite.anims.play(this.anim("idle"), true);
    }
  }

  crouch() {
    this.sprite.setFlipX(this.facing === "left");
    this.sprite.setVelocityX(0);
    this.sprite.anims.play(this.anim("crouch"), true);
    // The smaller hitbox only applies when facing right (this is how it behaved before the refactor).
    if (this.facing === "right") {
      this.setHitbox(HITBOX.crouching);
    }
    this.attackCombo = 0;
  }

  // Turns and moves horizontally according to the intent; stops when neither direction is held.
  steer(intent) {
    if (intent.left) {
      this.sprite.setFlipX(true);
      this.sprite.setVelocityX(-MOVE_SPEED);
      this.facing = "left";
    } else if (intent.right) {
      this.sprite.setFlipX(false);
      this.sprite.setVelocityX(MOVE_SPEED);
      this.facing = "right";
    } else {
      this.sprite.setFlipX(this.facing === "left");
      this.sprite.setVelocityX(0);
    }
  }

  setHitbox({ width, height, offsetX, offsetY }) {
    this.sprite.setSize(width, height, true).setOffset(offsetX, offsetY);
  }
}
