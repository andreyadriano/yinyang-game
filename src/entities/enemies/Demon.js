import { Enemy, ENEMY_STATE } from "./Enemy.js";

export {Demon};

const ANIM_KEYS = {
  idle: "demon-idle1",
  move: "demon-move1",
  attack: "demon-attack1",
  hurt: "demon-hurt1",
  die: "demon-die1"
};

let animationsCreated = false;
function createAnimations(anims) {
  if (animationsCreated) return;
  animationsCreated = true;

  anims.create({
      key: "demon-attack1",
      frames: anims.generateFrameNumbers('demon-attack1', { start: 0, end: 10 }),
      frameRate: 8
  });
  anims.create({
      key: "demon-idle1",
      frames: anims.generateFrameNumbers('demon-idle1', { start: 0, end: 5 }),
      frameRate: 5,
      repeat: -1
  });
  anims.create({
      key: "demon-move1",
      frames: anims.generateFrameNumbers('demon-idle1', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1
  });
  anims.create({
      key: "demon-hurt1",
      frames: anims.generateFrameNumbers('demon-attack1', { start: 0, end: 2 }),
      frameRate: 10
  });
  anims.create({
      key: "demon-die1",
      frames: anims.generateFrameNumbers('demon-attack1', { start: 0, end: 3 }),
      frameRate: 10
  });
}

// The demon hurts the player on this frame of its attack animation (6 of 10).
const ATTACK_DAMAGE_PROGRESS = 0.6000000000000001;

class Demon extends Enemy {
    constructor(scene, x, y, { gameState, audio, group } = {}){
        super(scene, { gameState, audio, animKeys: ANIM_KEYS, health: 175, facing: "left", deathSoundKey: "bossDie" });

        createAnimations(scene.anims);

        this.sprite = scene.physics.add.sprite(x, y, "demon-idle1");
        // Add to the group first: adding resets velocity, world bounds and immovable to the group's defaults.
        group.add(this.sprite);
        this.sprite.setData("owner", this);
        this.sprite.setScale(0.5);
        this.sprite.setSize(70, 100).setOffset(30, 35);
        this.sprite.setBounce(0);
        this.sprite.setCollideWorldBounds(true);
        this.sprite.setVelocityX(-100);
    }

    // Attacks or chases the closest player, if in range and not far above.
    updateFree() {
        const target = this.closestPlayer();
        const dx = this.x - target.sprite.body.position.x;
        const dy = target.sprite.body.position.y - this.y;

        if (((dx > 0 && dx < 250) || (dx > -250 && dx < 0)) && dy > -75) {
            if (dx < 35 && dx > 0) {
                this.faceAndAttack("left");
            } else if (dx > -50 && dx < 0) {
                this.faceAndAttack("right");
            } else if (dx < 250 && dx > 0) {
                this.chase("left");
            } else if (dx > -250 && dx < 0) {
                this.chase("right");
            }
        }
    }

    // The demon sprite faces right when flipped.
    faceAndAttack(facing) {
        this.sprite.setVelocityX(0);
        this.sprite.setFlipX(facing === "right");
        this.startAttack(facing);
    }

    chase(facing) {
        this.sprite.setVelocityX(facing === "left" ? -150 : 150);
        this.sprite.setSize(70, 80).setOffset(facing === "left" ? 30 : 55, 55);
        this.sprite.setFlipX(facing === "right");
        this.sprite.anims.play(this.animKeys.move, true);
        this.facing = facing;
    }

    onHurtFrame() {
        this.sprite.setSize(70, 100).setOffset(this.facing === "right" ? 50 : 100, 55);
    }

    onHurtFinished() {
        this.sprite.setSize(70, 100).setOffset(30, 35);
    }

    // The attack has two phases with different hitboxes: wind-up (first half) and strike.
    onAttackFrame() {
        const windUp = this.animProgress("attack") < 0.5;
        const left = this.facing === "left";
        if (windUp) {
            this.sprite.setSize(70, 100).setOffset(left ? 100 : 70, 60);
        } else {
            this.sprite.setSize(120, 80).setOffset(left ? 0 : 110, 100);
        }
    }

    onAttackFinished() {
        this.sprite.setSize(70, 100).setOffset(30, 35);
    }

    // Counts this boss as defeated (two bosses open the jail door).
    onDeathFinished() {
        this.gameState.defeatBoss(this.id);
        this.sprite.disableBody();
        this.sprite.anims.stop();
    }

    // What happens when a player and the demon overlap.
    handlePlayerHit(player) {
        // the demon hurts the player on its damage frame, and pushes the player back
        if (this.state === ENEMY_STATE.ATTACK && this.animProgress("attack") === ATTACK_DAMAGE_PROGRESS) {
            this.audio.get("bossAttack").play({ volume: 0.3 });
            player.takeHit(this.facing === "left" ? -125 : 125, -100);
            this.gameState.loseSoul(2, this.id);
        }
        // if the player attacks the demon, the demon gets knocked back a bit.
        else if (player.isAttacking()) {
            this.takePlayerAttack(player, -100);
        }
    }
}
