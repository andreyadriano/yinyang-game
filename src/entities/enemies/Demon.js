import { player, player2, playerPosition, player2Position } from "../../scenes/GameScene.js";
import { Enemy } from "./Enemy.js";

export {Demon};

const ANIM_KEYS = {
  idle: "demon-idle1",
  move: "demon-move1",
  attack: "demon-attack1",
  hurt: "demon-hurt1",
  die: "demon-die1"
};

class Demon extends Enemy {
    constructor(scene, x, y, { gameState, audio, group } = {}){
        super(scene, { gameState, audio, animKeys: ANIM_KEYS, health: 175 });
        const anims = scene.anims;
        this.demonposition = "left";
        this.bossmorto = 0;
        this.bossdying = 0;
        this.bosssatkin = 0;

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

        this.sprite = scene.physics.add.sprite( x, y, "demon-idle1");
        this.sprite.setScale(0.5);
        this.sprite.setSize(70, 100).setOffset(30,35);
        this.sprite.setBounce(0);
        this.sprite.setCollideWorldBounds(true);
        this.sprite.setVelocityX(-100);

        group.add(this.sprite);
        this.sprite.setData("owner", this);

        // FIM DO CONSTRUCTOR
    }
    update(){
        this.demonX = this.sprite.body.position.x;
        this.demonY = this.sprite.body.position.y;
        this.playerX = player.body.position.x;
        this.playerY = player.body.position.y;
        this.player2X = player2.body.position.x;
        this.player2Y = player2.body.position.y;
        this.demon_P1 = this.demonX - this.playerX;
        this.demon_P1_Y = this.playerY - this.demonY;
        this.demon_P2 = this.demonX - this.player2X;
        this.demon_P2_Y = this.player2Y - this.demonY;

        // AQUI EH QUANDO O BOSS TOMA DANO

        if(this.isPlayingAnim("die") && this.animProgress("die") === 1){
            if(this.gameState.bossesDefeated === 0){
                this.gameState.bossesDefeated = 1;
                this.bossmorto = 1;
            }
            else if(this.bossmorto === 0 && this.gameState.bossesDefeated === 1){
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

        // AQUI EH QUANDO O BOSS ATACA

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

        // AQUI EH O COMPORTAMENTO EM RELACAO AO PLAYER 1

        else if(this.scene.physics.closest(this.sprite, [player, player2]) === player && ((this.demon_P1 > 0 && this.demon_P1 < 250) || (this.demon_P1 > -250 && this.demon_P1 < 0)) && this.demon_P1_Y > -75){
            if (this.demon_P1 < 35 && this.demon_P1 > 0){
                this.sprite.setVelocityX(0);
                this.sprite.setFlipX(false);
                this.sprite.anims.play(this.animKeys.attack, true);
                this.demonposition = 'left';
            }
            else if (this.demon_P1 > -50 && this.demon_P1 < 0){
                this.sprite.setVelocityX(0);
                this.sprite.setFlipX(true);
                this.sprite.anims.play(this.animKeys.attack, true);
                this.demonposition = 'right';
            }
            else if (this.demon_P1 < 250 && this.demon_P1 > 0){
                this.sprite.setVelocityX(-150);
                this.sprite.setSize(70, 80).setOffset(30,55);
                this.sprite.setFlipX(false);
                this.sprite.anims.play(this.animKeys.move, true);
                this.demonposition = 'left';
            }
            else if (this.demon_P1 > -250 && this.demon_P1 < 0){
                this.sprite.setVelocityX(150);
                this.sprite.setSize(70, 80).setOffset(55,55);
                this.sprite.setFlipX(true);
                this.sprite.anims.play(this.animKeys.move, true);
                this.demonposition = 'right';
            }
        }

        // AQUI EH O COMPORTAMENTO EM RELACAO AO PLAYER 2

        else if(this.scene.physics.closest(this.sprite, [player, player2]) === player2 && ((this.demon_P2 > 0 && this.demon_P2 < 250 ) || (this.demon_P2 > -250 && this.demon_P2 < 0)) && this.demon_P2_Y > -75){
            if (this.demon_P2 < 35 && this.demon_P2 > 0){
                this.sprite.setVelocityX(0);
                this.sprite.setFlipX(false);
                this.sprite.anims.play(this.animKeys.attack, true);
                this.demonposition = 'left';
            }
            else if (this.demon_P2 > -50 && this.demon_P2 < 0){
                this.sprite.setVelocityX(0);
                this.sprite.setFlipX(true);
                this.sprite.anims.play(this.animKeys.attack, true);
                this.demonposition = 'right';
            }
            else if (this.demon_P2 < 250 && this.demon_P2 > 0){
                this.sprite.setVelocityX(-150);
                this.sprite.setSize(70, 80).setOffset(30,55);
                this.sprite.setFlipX(false);
                this.sprite.anims.play(this.animKeys.move, true);
                this.demonposition = 'left';
            }
            else if (this.demon_P2 > -250 && this.demon_P2 < 0){
                this.sprite.setVelocityX(150);
                this.sprite.setSize(70, 80).setOffset(30,55);
                this.sprite.setFlipX(true);
                this.sprite.anims.play(this.animKeys.move, true);
                this.demonposition = 'right';
            }
        }


    }

    handlePlayerHit(playerSprite) {
        const isPlayer1 = playerSprite === player;
        const facing = isPlayer1 ? playerPosition : player2Position;
        const prefix = isPlayer1 ? "yin" : "yang";
        const hurtAnim = `${prefix}-hurt`;
        const currentAnim = playerSprite.anims.getCurrentKey();
        const isAttacking = currentAnim === `${prefix}-attack1` || currentAnim === `${prefix}-attack2` || currentAnim === `${prefix}-attack3`;

        // se o demon ataca o jogador, o jogador eh empurrado pra tras
        if(this.isPlayingAnim("attack") && this.demonposition === "left" && this.animProgress("attack") === 0.6000000000000001){
            this.audio.get("bossAttack").play({ volume: 0.3 });
            playerSprite.setVelocityX(-125);
            playerSprite.setVelocityY(-100);
            playerSprite.anims.play(hurtAnim, true);
            this.gameState.soulCount -= 2;
        } else if(this.isPlayingAnim("attack") && this.demonposition === "right" && this.animProgress("attack") === 0.6000000000000001){
            this.audio.get("bossAttack").play({ volume: 0.3 });
            playerSprite.setVelocityX(125);
            playerSprite.setVelocityY(-100);
            playerSprite.anims.play(hurtAnim, true);
            this.gameState.soulCount -= 2;
        }
        // se o jogador ataca o demon, o demon eh jogado um pouco pra tras.
        else if (isAttacking) {
            this.sprite.setVelocityX(facing === "right" ? 150 : -150);
            this.sprite.setVelocityY(-100);
            playerSprite.setVelocityX(0);
            this.sprite.anims.play(this.animKeys.hurt, true);
            this.health -= 1;
        }
    }
    //FIM DA CLASSE
}
