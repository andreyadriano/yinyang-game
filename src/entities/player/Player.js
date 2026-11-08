import { SCENE_KEYS } from "../../scenes/sceneKeys.js";

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
  // `character` is both the texture key and the animation prefix ("yin" or "yang").
  // `input` is an input source (see KeyboardInput): it returns the intent for each frame.
  constructor(scene, { id, character, x, y, input, groundLayers, audio } = {}) {
    this.scene = scene;
    this.id = id;
    this.character = character;
    this.input = input;
    this.audio = audio;

    this.facing = "right";
    this.state = STATE.FREE;
    this.attackCombo = 0;
    this.isJumping = false;
    this.jumpBufferMs = 0;

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

  // Pushed back by an enemy or hazard: sets velocity and plays the hurt animation.
  takeHit(velocityX, velocityY) {
    if (this.isDead()) return;
    this.sprite.setVelocityX(velocityX);
    this.sprite.setVelocityY(velocityY);
    this.hurt();
  }

  // Enters the hurt state. With `restart`, the animation starts over even if it is already playing.
  hurt({ restart = false } = {}) {
    if (this.isDead()) return;
    this.state = STATE.HURT;
    this.sprite.anims.play(this.anim("hurt"), !restart);
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
    this.audio.get("jump").play({ volume: 0.3 });
    this.isJumping = true;
  }

  doubleJump() {
    this.sprite.setVelocityY(JUMP_VELOCITY);
    this.audio.get("jump").play({ volume: 0.3 });
    this.isJumping = false;
    this.jumpBufferMs = 0;
  }

  // Three-hit combo: each press starts the next attack, and the third one resets the combo.
  startAttack() {
    this.state = STATE.ATTACK;
    this.sprite.setFlipX(this.facing === "left");
    this.sprite.setVelocityX(0);
    this.sprite.anims.play(this.anim(ATTACK_ANIMS[this.attackCombo]), true);
    this.audio.get("swordWoosh").play({ volume: 0.3 });
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
