import { Enemy, ENEMY_STATE } from "./Enemy.js";
export { Skeleton };

const ANIM_KEYS = {
  idle: "skeleton-idle",
  walk: "skeleton-walk",
  attack: "skeleton-attack",
  hurt: "skeleton-hurt",
  die: "skeleton-die"
};

let animationsCreated = false;
function createAnimations(anims) {
  if (animationsCreated) return;
  animationsCreated = true;

  anims.create({
      key: 'skeleton-idle',
      frames: anims.generateFrameNumbers('skeleton-idle', { start: 0, end: 10 }),
      frameRate: 15,
      repeat: -1
    });

  anims.create({
      key: 'skeleton-walk',
      frames: anims.generateFrameNumbers('skeleton-walk', { start: 0, end: 12 }),
      frameRate: 20,
      repeat: -1
    });
  anims.create({
      key: 'skeleton-hurt',
      frames: anims.generateFrameNumbers('skeleton-hurt', { start: 0, end: 7 }),
      frameRate: 20,
    });
  anims.create({
      key: 'skeleton-attack',
      frames: anims.generateFrameNumbers('skeleton-attack', { start: 0, end: 17 }),
      frameRate: 30,
    });
  anims.create({
      key: 'skeleton-die',
      frames: anims.generateFrameNumbers('skeleton-die', { start: 0, end: 14 }),
      frameRate: 20
    });
}

// The skeleton hurts the player on this frame of its attack animation (9 of 17).
const ATTACK_DAMAGE_PROGRESS = 0.5294117647058824;

class Skeleton extends Enemy {
    constructor(scene, x, y, point, { gameState, audio, group } = {}){
        super(scene, { gameState, audio, animKeys: ANIM_KEYS, health: 50, facing: "right", deathSoundKey: "skeletonDie" });
        this.patrolPoint = point;
        this.hurtSoundPlayed = false; // so the hurt sound plays once per hit

        createAnimations(scene.anims);

        this.sprite = scene.physics.add.sprite(x, y, "skeleton-idle");
        // Add to the group first: adding resets velocity, world bounds and immovable to the group's defaults.
        group.add(this.sprite);
        this.sprite.setData("owner", this);
        this.sprite.setSize(27, 27, true).setOffset(0, 6);
        this.sprite.setBounce(0);
        this.sprite.setCollideWorldBounds(true);
        this.sprite.setVelocityX(-100);
    }

    // Attacks or chases the nearest player in range, otherwise patrols around its start point.
    updateFree() {
        if (this.reactToPlayers()) return;

        const distanceFromPoint = this.x - this.patrolPoint;
        if (distanceFromPoint > 45) {
            this.sprite.setVelocityX(-100);
            this.sprite.setFlipX(true);
            this.sprite.anims.play(this.animKeys.walk, true);
        } else if (distanceFromPoint < -45) {
            this.sprite.setVelocityX(100);
            this.sprite.setFlipX(false);
            this.sprite.anims.play(this.animKeys.walk, true);
        }
    }

    // Returns true when a player is close enough to attack or chase.
    reactToPlayers() {
        for (const player of this.playersNearestFirst()) {
            const dx = this.x - player.sprite.body.position.x;

            if (dx < 15 && dx > 0) {
                this.faceAndAttack("left");
                return true;
            } else if (dx > -15 && dx < 0) {
                this.faceAndAttack("right");
                return true;
            } else if (dx < 75 && dx > 0) {
                this.chase("left");
                return true;
            } else if (dx > -75 && dx < 0) {
                this.chase("right");
                return true;
            }
        }
        return false;
    }

    // The skeleton sprite faces left when flipped.
    faceAndAttack(facing) {
        this.sprite.setVelocityX(0);
        this.sprite.setFlipX(facing === "left");
        this.startAttack(facing);
    }

    chase(facing) {
        this.sprite.setVelocityX(facing === "left" ? -110 : 110);
        this.sprite.setSize(27, 27, true).setOffset(0, 6);
        this.sprite.setFlipX(facing === "left");
        this.sprite.anims.play(this.animKeys.walk, true);
        this.facing = facing;
    }

    getState() {
        return { ...super.getState(), hurtSoundPlayed: this.hurtSoundPlayed };
    }

    setState(state, options) {
        super.setState(state, options);
        this.hurtSoundPlayed = state.hurtSoundPlayed;
    }

    onHurtFrame() {
        if (!this.audio.isPlaying("skeletonHurt") && !this.hurtSoundPlayed) {
            this.audio.play("skeletonHurt");
            this.hurtSoundPlayed = true;
        }
    }

    onHurtFinished() {
        this.hurtSoundPlayed = false;
    }

    onAttackFrame() {
        this.sprite.setSize(40, 35).setOffset(this.facing === "left" ? -8 : 8, 0);
    }

    onAttackFinished() {
        this.sprite.setSize(27, 27, true).setOffset(0, 6);
    }

    // What happens when a player and the skeleton overlap.
    handlePlayerHit(player) {
        if (player.isDead()) return;

        // if the player attacks the skeleton, the skeleton gets knocked back a bit.
        if (player.isAttacking()) {
            this.takePlayerAttack(player, -75);
        }
        // the skeleton hurts the player on its damage frame, and pushes the player back
        else if (this.state === ENEMY_STATE.ATTACK && this.animProgress("attack") === ATTACK_DAMAGE_PROGRESS) {
            this.audio.play("skeletonAttack");
            player.takeHit(this.facing === "left" ? -125 : 125, -100);
            this.gameState.loseSoul(5, this.id);
        }
    }
}
