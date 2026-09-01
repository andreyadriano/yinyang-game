import { player, player2, playerPosition, player2Position} from "../../scenes/GameScene.js";
import { Enemy } from "./Enemy.js";
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
      frameRate: 20,
      repeat: -1
    });
}

class Skeleton extends Enemy {
    // Creates the skeleton class

    constructor(scene, x, y, point, { gameState, audio, group } = {}){
        super(scene, { gameState, audio, animKeys: ANIM_KEYS, health: 50 });
        this.skeletonpoint = point;
        this.skeletonposition = "right";
        this.skltDIE = 0;
        this.skltHURT = 0;

        // guards so the sounds don't keep repeating
        createAnimations(scene.anims);

          this.sprite = scene.physics.add.sprite( x, y, "skeleton-idle");
          this.sprite.setSize(27,27, true).setOffset(0, 6);
          this.sprite.setBounce(0);
          this.sprite.setCollideWorldBounds(true);
          this.sprite.setVelocityX(-100);
          //this.sprite.setOrigin(0.5);

          group.add(this.sprite);
          this.sprite.setData("owner", this);

          // END OF CONSTRUCTOR
    }

    update(){

        // VARIABLES

        this.skeletonX = this.sprite.body.position.x;
        this.skeletonY = this.sprite.body.position.y;
        this.skeletonguard = this.skeletonX - this.skeletonpoint;
        this.playerX = player.body.position.x;
        this.playerY = player.body.position.y;
        this.player2X = player2.body.position.x;
        this.player2Y = player2.body.position.y;
        this.skeleton_P1 = this.skeletonX - this.playerX;
        //this.skeleton_P1_Y = this.playerY - this.skeletonY;
        this.skeleton_P2 = this.skeletonX - this.player2X;
        //this.skeleton_P2_Y = this.player2Y - this.skeletonY;


		if(this.isPlayingAnim("die") && this.animProgress("die") === 1){
          this.sprite.disableBody(true, true);
        }
        else if(this.isPlayingAnim("die") && this.animProgress("die") < 1){
          this.sprite.setVelocity(0, 0);
          if(!this.audio.get("skeletonDie").isPlaying && this.skltDIE === 0){
            this.audio.get("skeletonDie").play();
            this.skltDIE = 1;
          }
        }
        else if(this.health <= 0){
          this.sprite.anims.play(this.animKeys.die);
        }
        else if (
          this.isPlayingAnim("hurt") &&
          this.animProgress("hurt") < 1 && this.skeletonposition === "right"
        ) {
          if(!this.audio.get("skeletonHurt").isPlaying && this.skltHURT === 0){
            this.audio.get("skeletonHurt").play();
            this.skltHURT = 1;
          }
          this.sprite.setTint(0xff0000);
        } else if (
          this.isPlayingAnim("hurt") &&
          this.animProgress("hurt") < 1 && this.skeletonposition === "left"
        ) {
          if(!this.audio.get("skeletonHurt").isPlaying && this.skltHURT === 0){
            this.audio.get("skeletonHurt").play();
            this.skltHURT = 1;
          }
          this.sprite.setTint(0xff0000);
        } else if (
          this.isPlayingAnim("hurt") &&
          this.animProgress("hurt") === 1
        ) {
          this.sprite.setVelocityX(0);
          this.sprite.clearTint();
          this.sprite.anims.play(this.animKeys.idle, true);
          this.skltHURT = 0;

        } else if (this.isPlayingAnim("attack")
        && this.animProgress("attack") < 0.5 && this.skeletonposition === 'left'){
            this.sprite.setSize(40,35).setOffset(-8,0);

        } else if (this.isPlayingAnim("attack")
        && this.animProgress("attack") < 1 && this.animProgress("attack") > 0.5 && this.skeletonposition === 'left'){
          this.sprite.setSize(40,35).setOffset(-8,0);

        } else if (this.isPlayingAnim("attack")
        && this.animProgress("attack") === 1 && this.skeletonposition==="left"){
            this.sprite.anims.play(this.animKeys.idle, true);
            this.sprite.setSize(27,27, true).setOffset(0, 6);

        } else if (this.isPlayingAnim("attack")
        && this.animProgress("attack") < 0.5 && this.skeletonposition === 'right'){
          this.sprite.setSize(40,35).setOffset(8,0);

        } else if (this.isPlayingAnim("attack")
        && this.animProgress("attack") < 1 && this.animProgress("attack") > 0.5 && this.skeletonposition === 'right'){
          this.sprite.setSize(40,35).setOffset(8,0);

        } else if (this.isPlayingAnim("attack")
        && this.animProgress("attack") === 1 && this.skeletonposition==="right"){
            this.sprite.anims.play(this.animKeys.idle, true);
            this.sprite.setSize(27,27, true).setOffset(0, 6);

        //      BEHAVIOR/ANIMATION CONDITIONS FOR PLAYER 1

        } else if (this.skeleton_P1 < 15 && this.skeleton_P1 > 0){
            this.sprite.setVelocityX(0);
            this.sprite.setFlipX(true);
            this.sprite.anims.play(this.animKeys.attack, true);
            this.skeletonposition = 'left';
        } else if (this.skeleton_P1 > -15 && this.skeleton_P1 < 0){
            this.sprite.setVelocityX(0);
            this.sprite.setFlipX(false);
            this.sprite.anims.play(this.animKeys.attack, true);
            this.skeletonposition = 'right';
        } else if (this.skeleton_P1 < 75 && this.skeleton_P1 > 0){
            this.sprite.setVelocityX(-110);
            this.sprite.setSize(27,27, true).setOffset(0, 6);
            this.sprite.setFlipX(true);
            this.sprite.anims.play(this.animKeys.walk, true);
            this.skeletonposition = 'left';
        } else if (this.skeleton_P1 > -75 && this.skeleton_P1 < 0){
            this.sprite.setVelocityX(110);
            this.sprite.setSize(27,27, true).setOffset(0, 6);
            this.sprite.setFlipX(false);
            this.sprite.anims.play(this.animKeys.walk, true);
            this.skeletonposition = 'right';
        }

        //      BEHAVIOR/ANIMATION CONDITIONS FOR PLAYER 2

      else if (this.skeleton_P2 < 15 && this.skeleton_P2 > 0){
        this.sprite.setVelocityX(0);
        this.sprite.setFlipX(true);
        this.sprite.anims.play(this.animKeys.attack, true);
        this.skeletonposition = 'left';
      } else if (this.skeleton_P2 > -15 && this.skeleton_P2 < 0){
        this.sprite.setVelocityX(0);
        this.sprite.setFlipX(false);
        this.sprite.anims.play(this.animKeys.attack, true);
        this.skeletonposition = 'right';
      } else if (this.skeleton_P2 < 75 && this.skeleton_P2 > 0){
        this.sprite.setVelocityX(-110);
        this.sprite.setSize(27,27, true).setOffset(0, 6);
        this.sprite.setFlipX(true);
        this.sprite.anims.play(this.animKeys.walk, true);
        this.skeletonposition = 'left';
      } else if (this.skeleton_P2 > -75 && this.skeleton_P2 < 0){
        this.sprite.setVelocityX(110);
        this.sprite.setSize(27,27, true).setOffset(0, 6);
        this.sprite.setFlipX(false);
        this.sprite.anims.play(this.animKeys.walk, true);
        this.skeletonposition = 'right';
      }

        else if (this.skeletonguard > 45){
            this.sprite.setVelocityX(-100);
            this.sprite.setFlipX(true);
            this.sprite.anims.play(this.animKeys.walk, true);
        }
        else if (this.skeletonguard < -45){
            this.sprite.setVelocityX(100);
            this.sprite.setFlipX(false);
            this.sprite.anims.play(this.animKeys.walk, true);
        }

    // END OF UPDATE

    }

    // COMBAT FUNCTIONS
    handlePlayerHit(playerSprite) {
      const isPlayer1 = playerSprite === player;
      const facing = isPlayer1 ? playerPosition : player2Position;
      const prefix = isPlayer1 ? "yin" : "yang";
      const deathAnim = `${prefix}-die`;
      const hurtAnim = `${prefix}-hurt`;
      const currentAnim = playerSprite.anims.getCurrentKey();
      const isAttacking = currentAnim === `${prefix}-attack1` || currentAnim === `${prefix}-attack2` || currentAnim === `${prefix}-attack3`;

      if (currentAnim === deathAnim) {
        return;
      }

      // if the player attacks the skeleton, the skeleton gets knocked back a bit.
      if (isAttacking) {
        this.sprite.setVelocityX(facing === "right" ? 150 : -150);
        this.sprite.setVelocityY(-75);
        playerSprite.setVelocityX(0);
        this.sprite.anims.play(this.animKeys.hurt, true);
        this.health -= 1;
      }
      // if the skeleton attacks the player, the player gets pushed back
      else if (this.isPlayingAnim("attack") && this.skeletonposition === "left" && this.animProgress("attack") === 0.5294117647058824) {
        this.audio.get("skeletonAttack").play();
        playerSprite.setVelocityX(-125);
        playerSprite.setVelocityY(-100);
        playerSprite.anims.play(hurtAnim, true);
        this.gameState.soulCount -= 5;
      } else if (this.isPlayingAnim("attack") && this.skeletonposition === "right" && this.animProgress("attack") === 0.5294117647058824) {
        this.audio.get("skeletonAttack").play();
        playerSprite.setVelocityX(125);
        playerSprite.setVelocityY(-100);
        playerSprite.anims.play(hurtAnim, true);
        this.gameState.soulCount -= 5;
      }
    }

}
