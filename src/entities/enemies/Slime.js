import { player, player2, playerPosition, player2Position} from "../../scenes/GameScene.js";
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
    // Cria a classe do slime

    constructor(scene, x, y, point, { gameState, audio, group } = {}){
        super(scene, { gameState, audio, animKeys: ANIM_KEYS, health: 20 });
        this.slimepoint = point;
        this.slimeposition = "left";
        this.slimedying = 0;

        //          ANIMACOES DO SLIME
        createAnimations(scene.anims);

  this.sprite = scene.physics.add.sprite( x, y, "slime0");
  this.sprite.setSize(20,20, true).setOffset(5,4);
  this.sprite.setBounce(0);
  this.sprite.setCollideWorldBounds(true);
  this.sprite.setVelocityX(-100);



  group.add(this.sprite);
  this.sprite.setData("owner", this);

// FIM DO CONSTRUCTOR
    }


  update() {

    // VARIAVEIS

        this.slimeX = this.sprite.body.position.x;
        this.slimeY = this.sprite.body.position.y;
        this.slimeguard = this.slimeX - this.slimepoint;
        this.playerX = player.body.position.x;
        this.playerY = player.body.position.y;
        this.player2X = player2.body.position.x;
        this.player2Y = player2.body.position.y;
        this.slime_P1 = this.slimeX - this.playerX;
        //this.slime_P1_Y = this.playerY - this.slimeY;
        this.slime_P2 = this.slimeX - this.player2X;
        //this.slime_P2_Y = this.player2Y - this.slimeY;

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

        //      CONDICIONAIS PARA COMPORTAMENTO/ANIMACAO P/ PLAYER 1

        } else if (this.slime_P1 < 15 && this.slime_P1 > 0){
            this.sprite.setVelocityX(0);
            this.sprite.setFlipX(false);
            this.sprite.anims.play(this.animKeys.attack, true);
            this.slimeposition = 'left';
        } else if (this.slime_P1 > -20 && this.slime_P1 < 0){
            this.sprite.setVelocityX(0);
            this.sprite.setFlipX(true);
            this.sprite.anims.play(this.animKeys.attack, true);
            this.slimeposition = 'right';
        } else if (this.slime_P1 < 75 && this.slime_P1 > 0){
            this.sprite.setVelocityX(-110);
            this.sprite.setSize(20,20, true).setOffset(7,4);
            this.sprite.setFlipX(false);
            this.sprite.anims.play(this.animKeys.move, true);
            this.slimeposition = 'left';
        } else if (this.slime_P1 > -75 && this.slime_P1 < 0){
            this.sprite.setVelocityX(110);
            this.sprite.setSize(20,20, true).setOffset(7,4);
            this.sprite.setFlipX(true);
            this.sprite.anims.play(this.animKeys.move, true);
            this.slimeposition = 'right';
        }

        //      CONDICIONAIS PARA COMPORTAMENTO/ANIMACAO P/ PLAYER 2

      else if (this.slime_P2 < 15 && this.slime_P2 > 0){
        this.sprite.setVelocityX(0);
        this.sprite.setFlipX(false);
        this.sprite.anims.play(this.animKeys.attack, true);
        this.slimeposition = 'left';
      } else if (this.slime_P2 > -20 && this.slime_P2 < 0){
        this.sprite.setVelocityX(0);
        this.sprite.setFlipX(true);
        this.sprite.anims.play(this.animKeys.attack, true);
        this.slimeposition = 'right';
      } else if (this.slime_P2 < 75 && this.slime_P2 > 0){
        this.sprite.setVelocityX(-110);
        this.sprite.setSize(20,20, true).setOffset(7,4);
        this.sprite.setFlipX(false);
        this.sprite.anims.play(this.animKeys.move, true);
        this.slimeposition = 'left';
      } else if (this.slime_P2 > -75 && this.slime_P2 < 0){
        this.sprite.setVelocityX(110);
        this.sprite.setSize(20,20, true).setOffset(7,4);
        this.sprite.setFlipX(true);
        this.sprite.anims.play(this.animKeys.move, true);
        this.slimeposition = 'right';
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

    //FIM DO UPDATE
    }

    // A FUNCAO QUE DEFINE O QUE ACONTECE QUANDO HÃ COLISAO ENTRE PLAYER E SLIME

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

      // se o jogador ataca o slime, o slime eh jogado um pouco pra tras.
      if (isAttacking) {
        this.sprite.setVelocityX(facing === "right" ? 150 : -150);
        this.sprite.setVelocityY(-100);
        playerSprite.setVelocityX(0);
        this.sprite.anims.play(this.animKeys.hurt, true);
        this.health -= 1;
      }
      // se o slime ataca o jogador, o jogador eh empurrado pra tras
      else if (this.isPlayingAnim("attack") && this.slimeposition === "left" && this.animProgress("attack") === 1) {
        playerSprite.setVelocityX(-125);
        playerSprite.setVelocityY(-100);
        playerSprite.anims.play(hurtAnim, true);
        this.audio.get("slimeAttack").play({volume: 0.3});
        this.gameState.soulCount -= 5;
      } else if (this.isPlayingAnim("attack") && this.slimeposition === "right" && this.animProgress("attack") === 1) {
        playerSprite.setVelocityX(125);
        playerSprite.setVelocityY(-100);
        playerSprite.anims.play(hurtAnim, true);
        this.audio.get("slimeAttack").play({volume: 0.3});
        this.gameState.soulCount -= 5;
      }
    }

// FIM DO CODIGO DA CLASSE
}
