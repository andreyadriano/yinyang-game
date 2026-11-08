import { Enemy } from "./Enemy.js";

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
      frameRate: 8,
      repeat: -1
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
      frameRate: 10,
      repeat: -1
  });
  anims.create({
      key: "demon-die1",
      frames: anims.generateFrameNumbers('demon-attack1', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
  });
}

class Demon extends Enemy {
    constructor(scene, x, y, { gameState, audio, group } = {}){
        super(scene, { gameState, audio, animKeys: ANIM_KEYS, health: 175 });
        this.demonposition = "left";
        this.deathCounted = 0;
        this.bossdying = 0;
        this.bosssatkin = 0;

        createAnimations(scene.anims);

        this.sprite = scene.physics.add.sprite( x, y, "demon-idle1");
        this.sprite.setScale(0.5);
        this.sprite.setSize(70, 100).setOffset(30,35);
        this.sprite.setBounce(0);
        this.sprite.setCollideWorldBounds(true);
        this.sprite.setVelocityX(-100);

        group.add(this.sprite);
        this.sprite.setData("owner", this);

        // END OF CONSTRUCTOR
    }
    update(){
        this.demonX = this.sprite.body.position.x;
        this.demonY = this.sprite.body.position.y;

        // THIS IS WHEN THE BOSS TAKES DAMAGE

        if(this.isPlayingAnim("die") && this.animProgress("die") === 1){
            if(this.gameState.bossesDefeated === 0){
                this.gameState.bossesDefeated = 1;
                this.deathCounted = 1;
            }
            else if(this.deathCounted === 0 && this.gameState.bossesDefeated === 1){
                this.gameState.bossesDefeated = 2;
            }
            this.sprite.disableBody();
            this.sprite.anims.stop(0);

        }
        else if(this.isPlayingAnim("die") && this.animProgress("die") < 1){
            this.sprite.setVelocity(0, 0);
            if(!this.audio.get("bossDie").isPlaying && this.bossdying === 0){
                this.audio.get("bossDie").play();
                this.bossdying = 1;
            }
        }
        else if(this.health <= 0){
            this.sprite.anims.play(this.animKeys.die);
        }
        else if (
            this.isPlayingAnim("hurt") &&
            this.animProgress("hurt") < 1 && this.demonposition === "right") {
            this.sprite.setSize(70, 100).setOffset(50,55);
            this.sprite.setTint(0xff0000);
        }
        else if (
            this.isPlayingAnim("hurt") &&
            this.animProgress("hurt") < 1 && this.demonposition === "left") {
            this.sprite.setSize(70, 100).setOffset(100,55);
            this.sprite.setTint(0xff0000);
        }
        else if (
            this.isPlayingAnim("hurt") &&
            this.animProgress("hurt") === 1) {
            this.sprite.setVelocityX(0);
            this.sprite.setSize(70, 100).setOffset(30,35);
            this.sprite.clearTint();
            this.sprite.anims.play(this.animKeys.idle, true);
        }

        // THIS IS WHEN THE BOSS ATTACKS

        else if (this.isPlayingAnim("attack") && this.animProgress("attack") < 0.5 && this.demonposition === 'left'){
            this.sprite.setSize(70, 100).setOffset(100,60);
        }
        else if (this.isPlayingAnim("attack") && this.animProgress("attack") < 1 && this.demonposition === 'left'){
            this.sprite.setSize(120, 80).setOffset(0,100);
        }
        else if (this.isPlayingAnim("attack") && this.animProgress("attack") === 1 && this.demonposition==="left"){
        this.sprite.anims.play(this.animKeys.idle, true);
        this.sprite.setSize(70, 100).setOffset(30,35);
        this.bossatkin = 0;
    }
        else if (this.isPlayingAnim("attack") && this.animProgress("attack") < 0.5 && this.demonposition === 'right'){
            this.sprite.setSize(70, 100).setOffset(70,60);
        }
        else if (this.isPlayingAnim("attack") && this.animProgress("attack") < 1 && this.demonposition === 'right'){
            this.sprite.setSize(120, 80).setOffset(110,100);
        }
        else if (this.isPlayingAnim("attack") && this.animProgress("attack") === 1 && this.demonposition==="right"){
            this.sprite.anims.play(this.animKeys.idle, true);
            this.sprite.setSize(70, 100).setOffset(30,35);
            this.bossatkin = 0;
        }

        // THIS IS THE BEHAVIOR RELATIVE TO THE CLOSEST PLAYER

        else {
            const target = this.closestPlayer();
            const dx = this.demonX - target.sprite.body.position.x;
            const dy = target.sprite.body.position.y - this.demonY;

            if (((dx > 0 && dx < 250) || (dx > -250 && dx < 0)) && dy > -75) {
                if (dx < 35 && dx > 0){
                    this.sprite.setVelocityX(0);
                    this.sprite.setFlipX(false);
                    this.sprite.anims.play(this.animKeys.attack, true);
                    this.demonposition = 'left';
                }
                else if (dx > -50 && dx < 0){
                    this.sprite.setVelocityX(0);
                    this.sprite.setFlipX(true);
                    this.sprite.anims.play(this.animKeys.attack, true);
                    this.demonposition = 'right';
                }
                else if (dx < 250 && dx > 0){
                    this.sprite.setVelocityX(-150);
                    this.sprite.setSize(70, 80).setOffset(30,55);
                    this.sprite.setFlipX(false);
                    this.sprite.anims.play(this.animKeys.move, true);
                    this.demonposition = 'left';
                }
                else if (dx > -250 && dx < 0){
                    this.sprite.setVelocityX(150);
                    this.sprite.setSize(70, 80).setOffset(55,55);
                    this.sprite.setFlipX(true);
                    this.sprite.anims.play(this.animKeys.move, true);
                    this.demonposition = 'right';
                }
            }
        }
    }

    handlePlayerHit(player) {
        // if the demon attacks the player, the player gets pushed back
        if(this.isPlayingAnim("attack") && this.demonposition === "left" && this.animProgress("attack") === 0.6000000000000001){
            this.audio.get("bossAttack").play({ volume: 0.3 });
            player.takeHit(-125, -100);
            this.gameState.soulCount -= 2;
        } else if(this.isPlayingAnim("attack") && this.demonposition === "right" && this.animProgress("attack") === 0.6000000000000001){
            this.audio.get("bossAttack").play({ volume: 0.3 });
            player.takeHit(125, -100);
            this.gameState.soulCount -= 2;
        }
        // if the player attacks the demon, the demon gets knocked back a bit.
        else if (player.isAttacking()) {
            this.sprite.setVelocityX(player.facing === "right" ? 150 : -150);
            this.sprite.setVelocityY(-100);
            player.sprite.setVelocityX(0);
            this.sprite.anims.play(this.animKeys.hurt, true);
            this.health -= 1;
        }
    }
    // END OF THE CLASS
}
