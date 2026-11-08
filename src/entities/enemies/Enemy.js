// States: FREE (patrol and chase, decided by the subclass), ATTACK, HURT and DIE.
// The checks run in the same order as before the refactor: dying first, then health, then the
// current state. Animation ends are polled in update() (see Player.js for why).
import { GAME_EVENT } from "../../core/gameEvents.js";
import { applySpriteState, getSpriteState } from "../../sim/spriteState.js";

export const ENEMY_STATE = { FREE: "free", ATTACK: "attack", HURT: "hurt", DIE: "die" };

export class Enemy {
  // `facing` is "left" or "right". `deathSoundKey` is the AudioManager key played once while dying.
  constructor(scene, { gameState, audio, animKeys, health, facing, deathSoundKey } = {}) {
    this.scene = scene;
    this.gameState = gameState;
    this.audio = audio;
    this.animKeys = animKeys;
    this.health = health;
    this.facing = facing;
    this.deathSoundKey = deathSoundKey;

    this.state = ENEMY_STATE.FREE;
    this.deathSoundPlayed = false;
    this.deathHandled = false;
  }

  isPlayingAnim(key) {
    return this.sprite.anims.getName() === this.animKeys[key];
  }

  animProgress(key) {
    return this.sprite.anims.getProgress(this.animKeys[key]);
  }

  // The animation reached its last frame or stopped (a stopped one also counts, so a skipped
  // last frame at a low frame rate cannot lock the enemy in a state).
  isAnimFinished() {
    const anims = this.sprite.anims;
    return anims.getProgress() === 1 || !anims.isPlaying;
  }

  update() {
    this.x = this.sprite.body.position.x;
    this.y = this.sprite.body.position.y;

    if (this.state === ENEMY_STATE.DIE) {
      this.updateDying();
    } else if (this.health <= 0) {
      this.startDying();
    } else if (this.state === ENEMY_STATE.HURT) {
      this.updateHurt();
    } else if (this.state === ENEMY_STATE.ATTACK) {
      this.updateAttack();
    } else {
      this.updateFree();
    }
  }

  // ---- transitions ----

  startAttack(facing) {
    this.facing = facing;
    this.state = ENEMY_STATE.ATTACK;
    this.sprite.anims.play(this.animKeys.attack, true);
  }

  // Called when a player hits the enemy. Hits do nothing visual to an enemy that is already dying.
  hurt() {
    if (this.state === ENEMY_STATE.DIE) return;
    if (this.state !== ENEMY_STATE.HURT) {
      this.gameState.events.emit(GAME_EVENT.ENEMY_HURT, { id: this.id, kind: this.kind });
    }
    this.state = ENEMY_STATE.HURT;
    this.sprite.anims.play(this.animKeys.hurt, true);
  }

  startDying() {
    this.state = ENEMY_STATE.DIE;
    this.sprite.anims.play(this.animKeys.die);
  }

  // ---- per-state updates ----

  updateDying() {
    if (this.deathHandled) return;

    if (this.isAnimFinished()) {
      this.deathHandled = true;
      this.onDeathFinished();
      this.gameState.events.emit(GAME_EVENT.ENEMY_DEFEATED, { id: this.id, kind: this.kind });
      return;
    }

    this.sprite.setVelocity(0, 0);
    if (!this.audio.isPlaying(this.deathSoundKey) && !this.deathSoundPlayed) {
      this.audio.play(this.deathSoundKey);
      this.deathSoundPlayed = true;
    }
  }

  updateHurt() {
    if (this.isAnimFinished()) {
      this.sprite.setVelocityX(0);
      this.sprite.clearTint();
      this.state = ENEMY_STATE.FREE;
      this.sprite.anims.play(this.animKeys.idle, true);
      this.onHurtFinished();
    } else {
      this.sprite.setTint(0xff0000);
      this.onHurtFrame();
    }
  }

  updateAttack() {
    if (this.isAnimFinished()) {
      this.state = ENEMY_STATE.FREE;
      this.sprite.anims.play(this.animKeys.idle, true);
      this.onAttackFinished();
    } else {
      this.onAttackFrame();
    }
  }

  // ---- saving and restoring (see src/sim/snapshot.js) ----

  getState() {
    return {
      ...getSpriteState(this.sprite),
      health: this.health,
      state: this.state,
      facing: this.facing,
      deathSoundPlayed: this.deathSoundPlayed,
      deathHandled: this.deathHandled
    };
  }

  setState(state, options) {
    applySpriteState(this.sprite, state, options);
    this.health = state.health;
    this.state = state.state;
    this.facing = state.facing;
    this.deathSoundPlayed = state.deathSoundPlayed;
    this.deathHandled = state.deathHandled;
  }

  // ---- hooks for subclasses ----

  updateFree() {}
  onDeathFinished() {
    this.sprite.disableBody(true, true);
  }
  onHurtFrame() {}
  onHurtFinished() {}
  onAttackFrame() {}
  onAttackFinished() {}

  // ---- helpers ----

  // The players that are in the game now (online, the other player is hidden until they connect).
  activePlayers() {
    return this.scene.players.filter((player) => player.sprite.active);
  }

  // Players ordered by horizontal distance to this enemy, nearest first.
  playersNearestFirst() {
    const x = this.sprite.body.position.x;
    return this.activePlayers().sort(
      (a, b) => Math.abs(x - a.sprite.body.position.x) - Math.abs(x - b.sprite.body.position.x)
    );
  }

  // The player closest to this enemy (Arcade physics distance), or null when nobody is in the game.
  closestPlayer() {
    const sprites = this.activePlayers().map((player) => player.sprite);
    if (sprites.length === 0) return null;
    return this.scene.physics.closest(this.sprite, sprites).getData("owner");
  }

  // Knocks the enemy back from an attacking player and hurts it.
  takePlayerAttack(player, knockbackY) {
    this.sprite.setVelocityX(player.facing === "right" ? 150 : -150);
    this.sprite.setVelocityY(knockbackY);
    player.sprite.setVelocityX(0);
    this.hurt();
    this.health -= 1;
  }
}
