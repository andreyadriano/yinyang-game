import { SCENE_KEYS } from "../../scenes/sceneKeys.js";

const JUMP_BUFFER_MS = 333; // ~20 frames at 60fps, kept as a time-based buffer instead of a frame count

export class Player {
  constructor(scene, { x, y, spriteKey, controls, groundLayers, audio } = {}) {
    this.scene = scene;
    this.spriteKey = spriteKey;
    this.controls = controls;
    this.audio = audio;

    this.position = "right";
    this.attackCombo = 0;
    this.isJumping = false;
    this.jumpBufferMs = 0;

    this.sprite = scene.physics.add.sprite(x, y, spriteKey);
    this.sprite.setSize(13, 25, true).setOffset(18, 10);
    this.sprite.setBounce(0);
    this.sprite.setCollideWorldBounds(true);

    groundLayers.forEach((layer) => {
      scene.physics.add.collider(this.sprite, layer);
    });
  }

  anim(name) {
    return `${this.spriteKey}-${name}`;
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
    } else if (this.isPlayingAnim("attack1") && this.animProgress("attack1") < 1 && this.position === "right") {
      sprite.setSize(15, 30, true).setOffset(25, 5);
    } else if (this.isPlayingAnim("attack1") && this.animProgress("attack1") < 1 && this.position === "left") {
      sprite.setSize(15, 30, true).setOffset(10, 5);
    } else if (this.isPlayingAnim("attack1") && this.animProgress("attack1") === 1) {
      sprite.anims.play(this.anim("idle"), true);
    }

    // ATTACK 2
    else if (this.isPlayingAnim("attack2") && this.animProgress("attack2") < 1 && this.position === "right") {
      sprite.setSize(15, 30, true).setOffset(25, 5);
    } else if (this.isPlayingAnim("attack2") && this.animProgress("attack2") < 1 && this.position === "left") {
      sprite.setSize(15, 30, true).setOffset(10, 5);
    } else if (this.isPlayingAnim("attack2") && this.animProgress("attack2") === 1) {
      sprite.anims.play(this.anim("idle"), true);
    }

    // ATTACK 3
    else if (this.isPlayingAnim("attack3") && this.animProgress("attack3") < 1 && this.position === "right") {
      sprite.setSize(15, 30, true).setOffset(25, 5);
    } else if (this.isPlayingAnim("attack3") && this.animProgress("attack3") < 1 && this.position === "left") {
      sprite.setSize(15, 30, true).setOffset(10, 5);
    } else if (this.isPlayingAnim("attack3") && this.animProgress("attack3") === 1) {
      sprite.anims.play(this.anim("idle"), true);
    }

    // CONDICOES PARA EXECUTAR ACOES

    else if (controls.up.isDown && sprite.body.blocked.down) {
      sprite.setVelocityY(-350);
      this.audio.get("jump").play({ volume: 0.3 });
      this.isJumping = true;
    } else if (!sprite.body.blocked.down && controls.up.isDown && this.isJumping && this.jumpBufferMs >= JUMP_BUFFER_MS) {
      sprite.setVelocityY(-350);
      this.audio.get("jump").play({ volume: 0.3 });
      this.isJumping = false;
      this.jumpBufferMs = 0;
    } else if (controls.attack.isDown && controls.down.isUp && sprite.body.blocked.down && this.position === "left" && this.attackCombo === 0) {
      sprite.setFlipX(true);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("attack1"), true);
      this.audio.get("swordWoosh").play({ volume: 0.3 });
      this.attackCombo = 1;
    } else if (controls.attack.isDown && controls.down.isUp && sprite.body.blocked.down && this.position === "right" && this.attackCombo === 0) {
      sprite.setFlipX(false);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("attack1"), true);
      this.audio.get("swordWoosh").play({ volume: 0.3 });
      this.attackCombo = 1;
    } else if (controls.attack.isDown && controls.down.isUp && sprite.body.blocked.down && this.position === "left" && this.attackCombo === 1) {
      sprite.setFlipX(true);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("attack2"), true);
      this.audio.get("swordWoosh").play({ volume: 0.3 });
      this.attackCombo = 2;
    } else if (controls.attack.isDown && controls.down.isUp && sprite.body.blocked.down && this.position === "right" && this.attackCombo === 1) {
      sprite.setFlipX(false);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("attack2"), true);
      this.audio.get("swordWoosh").play({ volume: 0.3 });
      this.attackCombo = 2;
    } else if (controls.attack.isDown && controls.down.isUp && sprite.body.blocked.down && this.position === "left" && this.attackCombo === 2) {
      sprite.setFlipX(true);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("attack3"), true);
      this.audio.get("swordWoosh").play({ volume: 0.3 });
      this.attackCombo = 0;
    } else if (controls.attack.isDown && controls.down.isUp && sprite.body.blocked.down && this.position === "right" && this.attackCombo === 2) {
      sprite.setFlipX(false);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("attack3"), true);
      this.audio.get("swordWoosh").play({ volume: 0.3 });
      this.attackCombo = 0;
    } else if (sprite.body.velocity.y < 0 && controls.left.isUp && controls.right.isUp && this.position === "left") {
      sprite.setFlipX(true);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("jump"), true);
      this.attackCombo = 0;
    } else if (sprite.body.velocity.y < 0 && controls.left.isUp && controls.right.isUp && this.position === "right") {
      sprite.setFlipX(false);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("jump"), true);
      this.attackCombo = 0;
    } else if (sprite.body.velocity.y < 0 && controls.left.isDown) {
      sprite.setFlipX(true);
      sprite.setVelocityX(-300);
      sprite.anims.play(this.anim("jump"), true);
      this.position = "left";
      this.attackCombo = 0;
    } else if (sprite.body.velocity.y < 0 && controls.right.isDown) {
      sprite.setFlipX(false);
      sprite.setVelocityX(300);
      sprite.anims.play(this.anim("jump"), true);
      this.position = "right";
      this.attackCombo = 0;
    } else if (!sprite.body.blocked.down && sprite.body.velocity.y > 0 && controls.left.isUp && controls.right.isUp && this.position === "left") {
      sprite.setFlipX(true);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("fall"), true);
      this.attackCombo = 0;
    } else if (!sprite.body.blocked.down && sprite.body.velocity.y > 0 && controls.left.isUp && controls.right.isUp && this.position === "right") {
      sprite.setFlipX(false);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("fall"), true);
      this.attackCombo = 0;
    } else if (!sprite.body.blocked.down && sprite.body.velocity.y > 0 && controls.left.isDown) {
      sprite.setFlipX(true);
      sprite.setVelocityX(-300);
      sprite.anims.play(this.anim("fall"), true);
      this.position = "left";
      this.attackCombo = 0;
    } else if (!sprite.body.blocked.down && sprite.body.velocity.y > 0 && controls.right.isDown) {
      sprite.setFlipX(false);
      sprite.setVelocityX(300);
      sprite.anims.play(this.anim("fall"), true);
      this.position = "right";
      this.attackCombo = 0;
    } else if (controls.left.isDown && sprite.body.blocked.down) {
      sprite.setFlipX(true);
      sprite.setVelocityX(-300);
      sprite.anims.play(this.anim("run"), true);
      this.position = "left";
      this.attackCombo = 0;
    } else if (controls.right.isDown && sprite.body.blocked.down) {
      sprite.setFlipX(false);
      sprite.setVelocityX(300);
      sprite.anims.play(this.anim("run"), true);
      this.position = "right";
      this.attackCombo = 0;
    } else if (controls.down.isDown && sprite.body.blocked.down && controls.attack.isUp && this.position === "left") {
      sprite.setFlipX(true);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("crouch"), true);
      this.attackCombo = 0;
    } else if (controls.down.isDown && sprite.body.blocked.down && controls.attack.isUp && this.position === "right") {
      sprite.setFlipX(false);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("crouch"), true);
      sprite.setSize(13, 20, true).setOffset(18, 15);
      this.attackCombo = 0;
    } else if (sprite.body.blocked.down && controls.right.isUp && controls.left.isUp && controls.attack.isUp && controls.down.isUp && this.position === "left") {
      sprite.setFlipX(true);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("idle"), true);
    } else if (sprite.body.blocked.down && controls.right.isUp && controls.left.isUp && controls.attack.isUp && controls.down.isUp && this.position === "right") {
      sprite.setFlipX(false);
      sprite.setVelocityX(0);
      sprite.anims.play(this.anim("idle"), true);
    }
  }
}
