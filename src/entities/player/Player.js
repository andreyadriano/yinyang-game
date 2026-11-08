import { SCENE_KEYS } from "../../scenes/sceneKeys.js";

const JUMP_BUFFER_MS = 333; // ~20 frames at 60fps, kept as a time-based buffer instead of a frame count

export class Player {
  // `character` is both the texture key and the animation prefix ("yin" or "yang").
  constructor(scene, { id, character, x, y, controls, groundLayers, audio } = {}) {
    this.scene = scene;
    this.id = id;
    this.character = character;
    this.controls = controls;
    this.audio = audio;

    this.facing = "right";
    this.attackCombo = 0;
    this.isJumping = false;
    this.jumpBufferMs = 0;

    this.sprite = scene.physics.add.sprite(x, y, character);
    this.sprite.setSize(13, 25, true).setOffset(18, 10);
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

  isAttacking() {
    return this.isPlayingAnim("attack1") || this.isPlayingAnim("attack2") || this.isPlayingAnim("attack3");
  }

  isDead() {
    return this.isPlayingAnim("die");
  }

  // Pushed back by an enemy or hazard: sets velocity and plays the hurt animation.
  takeHit(velocityX, velocityY) {
    this.sprite.setVelocityX(velocityX);
    this.sprite.setVelocityY(velocityY);
    this.sprite.anims.play(this.anim("hurt"), true);
  }

  isPlayingAnim(name) {
    return this.sprite.anims.getCurrentKey() === this.anim(name);
  }

  animProgress(name) {
    return this.sprite.anims.getProgress(this.anim(name));
  }

  forceDeath() {
    if (!this.isPlayingAnim("die")) {
      this.sprite.anims.play(this.anim("die"));
    }
  }

  update(time, delta) {
    const sprite = this.sprite;
    const controls = this.controls;

    if (this.isJumping) {
      this.jumpBufferMs += delta;
    }

    if (this.isPlayingAnim("idle")) {
      sprite.setSize(13, 25, true).setOffset(18, 10);
    }

    // DIE
    if (this.isPlayingAnim("die") && this.animProgress("die") < 1) {
      sprite.setVelocity(0, 0);
    } else if (this.isPlayingAnim("die") && this.animProgress("die") === 1) {
      this.scene.physics.pause();
      this.scene.scene.start(SCENE_KEYS.GAME_OVER);
    }

    // HURT
    else if (this.isPlayingAnim("hurt") && this.animProgress("hurt") < 1) {
      sprite.setTint(0xff0000);
    } else if (this.isPlayingAnim("hurt") && this.animProgress("hurt") === 1) {
      sprite.clearTint();
      sprite.anims.play(this.anim("idle"), true);

    // ATTACK 1
    } else if (this.isPlayingAnim("attack1") && this.animProgress("attack1") < 1 && this.facing === "right") {
      sprite.setSize(15, 30, true).setOffset(25, 5);
    } else if (this.isPlayingAnim("attack1") && this.animProgress("attack1") < 1 && this.facing === "left") {
      sprite.setSize(15, 30, true).setOffset(10, 5);
    } else if (this.isPlayingAnim("attack1") && this.animProgress("attack1") === 1) {
      sprite.anims.play(this.anim("idle"), true);
    }

    // ATTACK 2
    else if (this.isPlayingAnim("attack2") && this.animProgress("attack2") < 1 && this.facing === "right") {
      sprite.setSize(15, 30, true).setOffset(25, 5);
    } else if (this.isPlayingAnim("attack2") && this.animProgress("attack2") < 1 && this.facing === "left") {
      sprite.setSize(15, 30, true).setOffset(10, 5);
    } else if (this.isPlayingAnim("attack2") && this.animProgress("attack2") === 1) {
      sprite.anims.play(this.anim("idle"), true);
    }

    // ATTACK 3
    else if (this.isPlayingAnim("attack3") && this.animProgress("attack3") < 1 && this.facing === "right") {
      sprite.setSize(15, 30, true).setOffset(25, 5);
    } else if (this.isPlayingAnim("attack3") && this.animProgress("attack3") < 1 && this.facing === "left") {
      sprite.setSize(15, 30, true).setOffset(10, 5);
    } else if (this.isPlayingAnim("attack3") && this.animProgress("attack3") === 1) {
      sprite.anims.play(this.anim("idle"), true);
    }

    // CONDITIONS TO PERFORM ACTIONS

    else if (controls.up.isDown && sprite.body.blocked.down) {
      sprite.setVelocityY(-350);
      this.audio.get("jump").play({ volume: 0.3 });
      this.isJumping = true;
    } else if (!sprite.body.blocked.down && controls.up.isDown && this.isJumping && this.jumpBufferMs >= JUMP_BUFFER_MS) {
      sprite.setVelocityY(-350);
      this.audio.get("jump").play({ volume: 0.3 });
      this.isJumping = false;
      this.jumpBufferMs = 0;
    } else if (controls.attack.isDown && controls.down.isUp && sprite.body.blocked.down && this.facing === "left" && this.attackCombo === 0) {
      sprite.setFlipX(true);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("attack1"), true);
      this.audio.get("swordWoosh").play({ volume: 0.3 });
      this.attackCombo = 1;
    } else if (controls.attack.isDown && controls.down.isUp && sprite.body.blocked.down && this.facing === "right" && this.attackCombo === 0) {
      sprite.setFlipX(false);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("attack1"), true);
      this.audio.get("swordWoosh").play({ volume: 0.3 });
      this.attackCombo = 1;
    } else if (controls.attack.isDown && controls.down.isUp && sprite.body.blocked.down && this.facing === "left" && this.attackCombo === 1) {
      sprite.setFlipX(true);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("attack2"), true);
      this.audio.get("swordWoosh").play({ volume: 0.3 });
      this.attackCombo = 2;
    } else if (controls.attack.isDown && controls.down.isUp && sprite.body.blocked.down && this.facing === "right" && this.attackCombo === 1) {
      sprite.setFlipX(false);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("attack2"), true);
      this.audio.get("swordWoosh").play({ volume: 0.3 });
      this.attackCombo = 2;
    } else if (controls.attack.isDown && controls.down.isUp && sprite.body.blocked.down && this.facing === "left" && this.attackCombo === 2) {
      sprite.setFlipX(true);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("attack3"), true);
      this.audio.get("swordWoosh").play({ volume: 0.3 });
      this.attackCombo = 0;
    } else if (controls.attack.isDown && controls.down.isUp && sprite.body.blocked.down && this.facing === "right" && this.attackCombo === 2) {
      sprite.setFlipX(false);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("attack3"), true);
      this.audio.get("swordWoosh").play({ volume: 0.3 });
      this.attackCombo = 0;
    } else if (sprite.body.velocity.y < 0 && controls.left.isUp && controls.right.isUp && this.facing === "left") {
      sprite.setFlipX(true);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("jump"), true);
      this.attackCombo = 0;
    } else if (sprite.body.velocity.y < 0 && controls.left.isUp && controls.right.isUp && this.facing === "right") {
      sprite.setFlipX(false);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("jump"), true);
      this.attackCombo = 0;
    } else if (sprite.body.velocity.y < 0 && controls.left.isDown) {
      sprite.setFlipX(true);
      sprite.setVelocityX(-300);
      sprite.anims.play(this.anim("jump"), true);
      this.facing = "left";
      this.attackCombo = 0;
    } else if (sprite.body.velocity.y < 0 && controls.right.isDown) {
      sprite.setFlipX(false);
      sprite.setVelocityX(300);
      sprite.anims.play(this.anim("jump"), true);
      this.facing = "right";
      this.attackCombo = 0;
    } else if (!sprite.body.blocked.down && sprite.body.velocity.y > 0 && controls.left.isUp && controls.right.isUp && this.facing === "left") {
      sprite.setFlipX(true);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("fall"), true);
      this.attackCombo = 0;
    } else if (!sprite.body.blocked.down && sprite.body.velocity.y > 0 && controls.left.isUp && controls.right.isUp && this.facing === "right") {
      sprite.setFlipX(false);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("fall"), true);
      this.attackCombo = 0;
    } else if (!sprite.body.blocked.down && sprite.body.velocity.y > 0 && controls.left.isDown) {
      sprite.setFlipX(true);
      sprite.setVelocityX(-300);
      sprite.anims.play(this.anim("fall"), true);
      this.facing = "left";
      this.attackCombo = 0;
    } else if (!sprite.body.blocked.down && sprite.body.velocity.y > 0 && controls.right.isDown) {
      sprite.setFlipX(false);
      sprite.setVelocityX(300);
      sprite.anims.play(this.anim("fall"), true);
      this.facing = "right";
      this.attackCombo = 0;
    } else if (controls.left.isDown && sprite.body.blocked.down) {
      sprite.setFlipX(true);
      sprite.setVelocityX(-300);
      sprite.anims.play(this.anim("run"), true);
      this.facing = "left";
      this.attackCombo = 0;
    } else if (controls.right.isDown && sprite.body.blocked.down) {
      sprite.setFlipX(false);
      sprite.setVelocityX(300);
      sprite.anims.play(this.anim("run"), true);
      this.facing = "right";
      this.attackCombo = 0;
    } else if (controls.down.isDown && sprite.body.blocked.down && controls.attack.isUp && this.facing === "left") {
      sprite.setFlipX(true);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("crouch"), true);
      this.attackCombo = 0;
    } else if (controls.down.isDown && sprite.body.blocked.down && controls.attack.isUp && this.facing === "right") {
      sprite.setFlipX(false);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("crouch"), true);
      sprite.setSize(13, 20, true).setOffset(18, 15);
      this.attackCombo = 0;
    } else if (sprite.body.blocked.down && controls.right.isUp && controls.left.isUp && controls.attack.isUp && controls.down.isUp && this.facing === "left") {
      sprite.setFlipX(true);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("idle"), true);
    } else if (sprite.body.blocked.down && controls.right.isUp && controls.left.isUp && controls.attack.isUp && controls.down.isUp && this.facing === "right") {
      sprite.setFlipX(false);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("idle"), true);
    }
  }
}
