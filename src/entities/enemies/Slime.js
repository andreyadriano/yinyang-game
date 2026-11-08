import { Enemy } from "./Enemy.js";
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
    // Creates the slime class

    constructor(scene, x, y, point, { gameState, audio, group } = {}){
        super(scene, { gameState, audio, animKeys: ANIM_KEYS, health: 20 });
        this.slimepoint = point;
        this.slimeposition = "left";
        this.slimedying = 0;

        //          SLIME ANIMATIONS
        createAnimations(scene.anims);

  this.sprite = scene.physics.add.sprite( x, y, "slime0");
  this.sprite.setSize(20,20, true).setOffset(5,4);
  this.sprite.setBounce(0);
  this.sprite.setCollideWorldBounds(true);
  this.sprite.setVelocityX(-100);



  group.add(this.sprite);
  this.sprite.setData("owner", this);

// END OF CONSTRUCTOR
    }


  update() {

    // VARIABLES

        this.slimeX = this.sprite.body.position.x;
        this.slimeY = this.sprite.body.position.y;
        this.slimeguard = this.slimeX - this.slimepoint;

        if(this.isPlayingAnim("die") && this.animProgress("die") === 1){
          this.sprite.disableBody(true, true);
        }
        else if(this.isPlayingAnim("die") && this.animProgress("die") < 1){
          this.sprite.setVelocity(0, 0);
          if(!this.audio.get("slimeDie").isPlaying && this.slimedying === 0){
            this.audio.get("slimeDie").play();
            this.slimedying = 1;
          }
        }
        else if(this.health <= 0){
          this.sprite.anims.play(this.animKeys.die);
        }
        else if (
          this.isPlayingAnim("hurt") &&
          this.animProgress("hurt") < 1 && this.slimeposition === "right"
        ) {
          this.sprite.setSize(20, 20, true).setOffset(0, 4);
          this.sprite.setTint(0xff0000);
        } else if (
          this.isPlayingAnim("hurt") &&
          this.animProgress("hurt") < 1 && this.slimeposition === "left"
        ) {
          this.sprite.setSize(20, 20, true).setOffset(0, 4);
          this.sprite.setTint(0xff0000);
        } else if (
          this.isPlayingAnim("hurt") &&
          this.animProgress("hurt") === 1
        ) {
          this.sprite.setVelocityX(0);
          this.sprite.setSize(20, 20, true).setOffset(0, 4);
          this.sprite.clearTint();
          this.sprite.anims.play(this.animKeys.idle, true);

        } else if (this.isPlayingAnim("attack")
        && this.animProgress("attack") < 1 && this.slimeposition === 'left'){
            this.sprite.setSize(30,20).setOffset(-8,4);

        } else if (this.isPlayingAnim("attack")
        && this.animProgress("attack") === 1 && this.slimeposition==="left"){
            this.sprite.anims.play(this.animKeys.idle, true);
            this.sprite.setSize(20,20).setOffset(0,4);

        } else if (this.isPlayingAnim("attack")
        && this.animProgress("attack") < 1 && this.slimeposition === 'right'){
            this.sprite.setSize(30,20).setOffset(8,4);

        } else if (this.isPlayingAnim("attack")
        && this.animProgress("attack") === 1 && this.slimeposition==="right"){
            this.sprite.anims.play(this.animKeys.idle, true);
            this.sprite.setSize(20,20).setOffset(0,4);

        //      BEHAVIOR/ANIMATION CONDITIONS FOR THE NEAREST PLAYER

        } else if (this.reactToPlayers()){
            // a player is close: the slime attacked or chased (handled in reactToPlayers)
        }

        else if (this.slimeguard > 45){
            this.sprite.setVelocityX(-100);
            this.sprite.setFlipX(false);
            this.sprite.anims.play(this.animKeys.move, true);
        }
        else if (this.slimeguard < -45){
            this.sprite.setVelocityX(100);
            this.sprite.setFlipX(true);
            this.sprite.anims.play(this.animKeys.move, true);
        }

    // END OF UPDATE
    }

    // Attacks or chases the nearest player in range. Returns true when it did something.
    reactToPlayers() {
      for (const player of this.playersNearestFirst()) {
        const dx = this.slimeX - player.sprite.body.position.x;

        if (dx < 15 && dx > 0){
            this.sprite.setVelocityX(0);
            this.sprite.setFlipX(false);
            this.sprite.anims.play(this.animKeys.attack, true);
            this.slimeposition = 'left';
            return true;
        } else if (dx > -20 && dx < 0){
            this.sprite.setVelocityX(0);
            this.sprite.setFlipX(true);
            this.sprite.anims.play(this.animKeys.attack, true);
            this.slimeposition = 'right';
            return true;
        } else if (dx < 75 && dx > 0){
            this.sprite.setVelocityX(-110);
            this.sprite.setSize(20,20, true).setOffset(7,4);
            this.sprite.setFlipX(false);
            this.sprite.anims.play(this.animKeys.move, true);
            this.slimeposition = 'left';
            return true;
        } else if (dx > -75 && dx < 0){
            this.sprite.setVelocityX(110);
            this.sprite.setSize(20,20, true).setOffset(7,4);
            this.sprite.setFlipX(true);
            this.sprite.anims.play(this.animKeys.move, true);
            this.slimeposition = 'right';
            return true;
        }
      }
      return false;
    }

    // DEFINES WHAT HAPPENS WHEN THE PLAYER AND THE SLIME COLLIDE

    handlePlayerHit(player) {
      if (player.isDead()) {
        return;
      }

      // if the player attacks the slime, the slime gets knocked back a bit.
      if (player.isAttacking()) {
        this.sprite.setVelocityX(player.facing === "right" ? 150 : -150);
        this.sprite.setVelocityY(-100);
        player.sprite.setVelocityX(0);
        this.sprite.anims.play(this.animKeys.hurt, true);
        this.health -= 1;
      }
      // if the slime attacks the player, the player gets pushed back
      else if (this.isPlayingAnim("attack") && this.slimeposition === "left" && this.animProgress("attack") === 1) {
        player.takeHit(-125, -100);
        this.audio.get("slimeAttack").play({volume: 0.3});
        this.gameState.soulCount -= 5;
      } else if (this.isPlayingAnim("attack") && this.slimeposition === "right" && this.animProgress("attack") === 1) {
        player.takeHit(125, -100);
        this.audio.get("slimeAttack").play({volume: 0.3});
        this.gameState.soulCount -= 5;
      }
    }

// END OF THE CLASS
}
