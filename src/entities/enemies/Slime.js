import { Enemy, ENEMY_STATE } from "./Enemy.js";
export { Slime };

const ANIM_KEYS = {
  idle: "slime-idle",
  move: "slime-move",
  attack: "slime-attack",
  hurt: "slime-hurt",
  die: "slime-die"
};

let animationsCreated = false;
function createAnimations(anims) {
  if (animationsCreated) return;
  animationsCreated = true;

  anims.create({
    key: 'slime-idle',
    frames: anims.generateFrameNumbers('slimesheet', { start: 0, end: 2 }),
    frameRate: 10,
    repeat: -1
  });
  anims.create({
    key: 'slime-move',
    frames: anims.generateFrameNumbers('slimesheet', { start: 4, end: 7 }),
    frameRate: 10,
    repeat: -1
  });
  anims.create({
    key: 'slime-attack',
    frames: anims.generateFrameNumbers('slimesheet', { start: 8, end: 12 }),
    frameRate: 10,
  });
  anims.create({
    key: 'slime-hurt',
    frames: anims.generateFrameNumbers('slimesheet', { start: 13, end: 16 }),
    frameRate: 15
  });
  anims.create({
    key: 'slime-die',
    frames: anims.generateFrameNumbers('slimesheet', { start: 17, end: 20 }),
    frameRate: 8
  });
}

class Slime extends Enemy {
    constructor(scene, x, y, point, { gameState, audio, group } = {}){
        super(scene, { gameState, audio, animKeys: ANIM_KEYS, health: 20, facing: "left", deathSoundKey: "slimeDie" });
        this.patrolPoint = point;

        createAnimations(scene.anims);

        this.sprite = scene.physics.add.sprite(x, y, "slime0");
        // Add to the group first: adding resets velocity, world bounds and immovable to the group's defaults.
        group.add(this.sprite);
        this.sprite.setData("owner", this);
        this.sprite.setSize(20, 20, true).setOffset(5, 4);
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
            this.sprite.setFlipX(false);
            this.sprite.anims.play(this.animKeys.move, true);
        } else if (distanceFromPoint < -45) {
            this.sprite.setVelocityX(100);
            this.sprite.setFlipX(true);
            this.sprite.anims.play(this.animKeys.move, true);
        }
    }

    // Returns true when a player is close enough to attack or chase.
    reactToPlayers() {
        for (const player of this.playersNearestFirst()) {
            const dx = this.x - player.sprite.body.position.x;

            if (dx < 15 && dx > 0) {
                this.faceAndAttack("left");
                return true;
            } else if (dx > -20 && dx < 0) {
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

    faceAndAttack(facing) {
        this.sprite.setVelocityX(0);
        this.sprite.setFlipX(facing === "right");
        this.startAttack(facing);
    }

    chase(facing) {
        this.sprite.setVelocityX(facing === "left" ? -110 : 110);
        this.sprite.setSize(20, 20, true).setOffset(7, 4);
        this.sprite.setFlipX(facing === "right");
        this.sprite.anims.play(this.animKeys.move, true);
        this.facing = facing;
    }

    onHurtFrame() {
        this.sprite.setSize(20, 20, true).setOffset(0, 4);
    }

    onHurtFinished() {
        this.sprite.setSize(20, 20, true).setOffset(0, 4);
    }

    onAttackFrame() {
        this.sprite.setSize(30, 20).setOffset(this.facing === "left" ? -8 : 8, 4);
    }

    onAttackFinished() {
        this.sprite.setSize(20, 20).setOffset(0, 4);
    }

    // What happens when a player and the slime overlap.
    handlePlayerHit(player) {
        if (player.isDead()) return;

        // if the player attacks the slime, the slime gets knocked back a bit.
        if (player.isAttacking()) {
            this.takePlayerAttack(player, -100);
        }
        // the slime hurts the player on the last frame of its attack, and pushes the player back
        else if (this.state === ENEMY_STATE.ATTACK && this.animProgress("attack") === 1) {
            player.takeHit(this.facing === "left" ? -125 : 125, -100);
            this.audio.play("slimeAttack", { volume: 0.3 });
            this.gameState.loseSoul(5, this.id);
        }
    }
}
