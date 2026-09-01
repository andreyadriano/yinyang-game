import { player, player2, SoulCount, BossesMortos,  playerPosition, player2Position } from "../../scenes/GameScene.js";
import { topLayer, topLayer2, topLayer3 } from "../../scenes/GameScene.js";
import { bossdie, bossatk } from "../../scenes/GameScene.js";

export {Demon};

export default class Demon {
    constructor(scene, x, y){
        this.scene = scene;
        const anims = scene.anims;
        this.demonposition = "left";
        this.Life = { valor: 175 };
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
        
        scene.physics.add.collider(this.sprite, topLayer);
        scene.physics.add.collider(this.sprite, topLayer2);
        scene.physics.add.collider(this.sprite, topLayer3);
  
        scene.physics.add.overlap(player, this.sprite, this.hitDemon1, null, this);
        scene.physics.add.overlap(player2, this.sprite, this.hitDemon2, null, this);
        
        // FIM DO CONSTRUCTOR
    }
    update(){
        //console.log(this.Life.valor, SoulCount.valor);

        /*if(this.sprite.anims.getCurrentKey() === "demon-attack1"){
            console.log(this.sprite.anims.getProgress("demon-attack1"));
        }*/

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

        if(this.sprite.anims.getCurrentKey() === "demon-die1" && this.sprite.anims.getProgress("demon-die1") === 1){
            if(BossesMortos.valor === 0){
                BossesMortos.valor = 1;
                this.bossmorto = 1;
            }
            else if(this.bossmorto === 0 && BossesMortos.valor === 1){
                BossesMortos.valor = 2;
            }
            this.sprite.disableBody();
            this.sprite.anims.stop(0);
            
        }
        else if(this.sprite.anims.getCurrentKey() === "demon-die1" && this.sprite.anims.getProgress("demon-die1") < 1){
            this.sprite.setVelocity(0, 0);
            if(!bossdie.isPlaying && this.bossdying === 0){
                bossdie.play();
                this.bossdying = 1;
            }
        }
        else if(this.Life.valor <= 0){
            this.sprite.anims.play("demon-die1");
        }
        else if (
            this.sprite.anims.getCurrentKey() === "demon-hurt1" &&
            this.sprite.anims.getProgress("demon-hurt1") < 1 && this.demonposition === "right") {
            this.sprite.setSize(70, 100).setOffset(50,55);
            this.sprite.setTint(0xff0000);
        } 
        else if (
            this.sprite.anims.getCurrentKey() === "demon-hurt1" &&
            this.sprite.anims.getProgress("demon-hurt1") < 1 && this.demonposition === "left") {
            this.sprite.setSize(70, 100).setOffset(100,55);
            this.sprite.setTint(0xff0000);
        } 
        else if (
            this.sprite.anims.getCurrentKey() === "demon-hurt1" &&
            this.sprite.anims.getProgress("demon-hurt1") === 1) {
            this.sprite.setVelocityX(0);
            this.sprite.setSize(70, 100).setOffset(30,35);
            this.sprite.clearTint();
            this.sprite.anims.play("demon-idle1", true);
        }

        // AQUI EH QUANDO O BOSS ATACA

        else if (this.sprite.anims.getCurrentKey() === 'demon-attack1' && this.sprite.anims.getProgress('demon-attack1') < 0.5 && this.demonposition === 'left'){
            this.sprite.setSize(70, 100).setOffset(100,60);
        }
        else if (this.sprite.anims.getCurrentKey() === 'demon-attack1' && this.sprite.anims.getProgress('demon-attack1') < 1 && this.demonposition === 'left'){
            this.sprite.setSize(120, 80).setOffset(0,100);
        } 
        else if (this.sprite.anims.getCurrentKey() === 'demon-attack1' && this.sprite.anims.getProgress('demon-attack1') === 1 && this.demonposition==="left"){
        this.sprite.anims.play('demon-idle1', true);
        this.sprite.setSize(70, 100).setOffset(30,35);
        this.bossatkin = 0;
    }
        else if (this.sprite.anims.getCurrentKey() === 'demon-attack1' && this.sprite.anims.getProgress('demon-attack1') < 0.5 && this.demonposition === 'right'){
            this.sprite.setSize(70, 100).setOffset(70,60);
        }
        else if (this.sprite.anims.getCurrentKey() === 'demon-attack1' && this.sprite.anims.getProgress('demon-attack1') < 1 && this.demonposition === 'right'){
            this.sprite.setSize(120, 80).setOffset(110,100);
        } 
        else if (this.sprite.anims.getCurrentKey() === 'demon-attack1' && this.sprite.anims.getProgress('demon-attack1') === 1 && this.demonposition==="right"){
            this.sprite.anims.play('demon-idle1', true);
            this.sprite.setSize(70, 100).setOffset(30,35);
            this.bossatkin = 0;
        }

        // AQUI EH O COMPORTAMENTO EM RELACAO AO PLAYER 1

        else if(this.scene.physics.closest(this.sprite, [player, player2]) === player && ((this.demon_P1 > 0 && this.demon_P1 < 250) || (this.demon_P1 > -250 && this.demon_P1 < 0)) && this.demon_P1_Y > -75){
            if (this.demon_P1 < 35 && this.demon_P1 > 0){
                this.sprite.setVelocityX(0);
                this.sprite.setFlipX(false);
                this.sprite.anims.play('demon-attack1', true);
                this.demonposition = 'left';
            } 
            else if (this.demon_P1 > -50 && this.demon_P1 < 0){
                this.sprite.setVelocityX(0);
                this.sprite.setFlipX(true);
                this.sprite.anims.play('demon-attack1', true);
                this.demonposition = 'right';
            } 
            else if (this.demon_P1 < 250 && this.demon_P1 > 0){
                this.sprite.setVelocityX(-150);
                this.sprite.setSize(70, 80).setOffset(30,55);
                this.sprite.setFlipX(false);
                this.sprite.anims.play('demon-move1', true);
                this.demonposition = 'left';
            } 
            else if (this.demon_P1 > -250 && this.demon_P1 < 0){
                this.sprite.setVelocityX(150);
                this.sprite.setSize(70, 80).setOffset(55,55);
                this.sprite.setFlipX(true);
                this.sprite.anims.play('demon-move1', true);
                this.demonposition = 'right';
            }
        }

        // AQUI EH O COMPORTAMENTO EM RELACAO AO PLAYER 2

        else if(this.scene.physics.closest(this.sprite, [player, player2]) === player2 && ((this.demon_P2 > 0 && this.demon_P2 < 250 ) || (this.demon_P2 > -250 && this.demon_P2 < 0)) && this.demon_P2_Y > -75){
            if (this.demon_P2 < 35 && this.demon_P2 > 0){
                this.sprite.setVelocityX(0);
                this.sprite.setFlipX(false);
                this.sprite.anims.play('demon-attack1', true);
                this.demonposition = 'left';
            } 
            else if (this.demon_P2 > -50 && this.demon_P2 < 0){
                this.sprite.setVelocityX(0);
                this.sprite.setFlipX(true);
                this.sprite.anims.play('demon-attack1', true);
                this.demonposition = 'right';
            } 
            else if (this.demon_P2 < 250 && this.demon_P2 > 0){
                this.sprite.setVelocityX(-150);
                this.sprite.setSize(70, 80).setOffset(30,55);
                this.sprite.setFlipX(false);
                this.sprite.anims.play('demon-move1', true);
                this.demonposition = 'left';
            } 
            else if (this.demon_P2 > -250 && this.demon_P2 < 0){
                this.sprite.setVelocityX(150);
                this.sprite.setSize(70, 80).setOffset(30,55);
                this.sprite.setFlipX(true);
                this.sprite.anims.play('demon-move1', true);
                this.demonposition = 'right';
            }
        }

    
    }

    hitDemon1(){
        
        //se o demon ataca o jogador, o jogador eh empurrado pra tras
        if(this.sprite.anims.getCurrentKey() === 'demon-attack1' && this.demonposition === "left" && this.sprite.anims.getProgress('demon-attack1') === 0.6000000000000001){
            bossatk.play({ volume: 0.3 });
            player.setVelocityX(-125);
            player.setVelocityY(-100);
            player.anims.play('yin-hurt', true);
            SoulCount.valor -= 2;
        } else if(this.sprite.anims.getCurrentKey() === 'demon-attack1' && this.demonposition === "right" && this.sprite.anims.getProgress('demon-attack1') === 0.6000000000000001){
            bossatk.play({ volume: 0.3 });
            player.setVelocityX(125);
            player.setVelocityY(-100);
            player.anims.play('yin-hurt', true);
            SoulCount.valor -= 2;
        }
        //se o jogador ataca o demon, o demon eh jogado um pouco pra tras. 
        else if(player.anims.getCurrentKey() === 'yin-attack1' && playerPosition==="right"){
            this.sprite.setVelocityX(150);
            this.sprite.setVelocityY(-100);
            player.setVelocityX(0);
            this.sprite.anims.play("demon-hurt1", true);
            this.Life.valor -= 1;
        } else if(player.anims.getCurrentKey() === 'yin-attack1' && playerPosition==="left"){
            this.sprite.setVelocityX(-150);
            this.sprite.setVelocityY(-100);
            player.setVelocityX(0);
            this.sprite.anims.play("demon-hurt1", true);
            this.Life.valor -= 1;
        } else if(player.anims.getCurrentKey() === 'yin-attack2' && playerPosition==="right"){
            this.sprite.setVelocityX(150);
            this.sprite.setVelocityY(-100);
            player.setVelocityX(0);
            this.sprite.anims.play("demon-hurt1", true);
            this.Life.valor -= 1;
        } else if(player.anims.getCurrentKey() === 'yin-attack2' && playerPosition==="left"){
            this.sprite.setVelocityX(-150);
            this.sprite.setVelocityY(-100);
            player.setVelocityX(0);
            this.sprite.anims.play("demon-hurt1", true);
            this.Life.valor -= 1;
        } else if(player.anims.getCurrentKey() === 'yin-attack3' && playerPosition==="right"){
            this.sprite.setVelocityX(150);
            this.sprite.setVelocityY(-100);
            player.setVelocityX(0);
            this.sprite.anims.play("demon-hurt1", true);
            this.Life.valor -= 1;
        } else if(player.anims.getCurrentKey() === 'yin-attack3' && playerPosition==="left"){
            this.sprite.setVelocityX(-150);
            this.sprite.setVelocityY(-100);
            player.setVelocityX(0);
            this.sprite.anims.play("demon-hurt1", true);
            this.Life.valor -= 1;
        }
    }

    hitDemon2(){

        //se o demon ataca o jogador, o jogador eh empurrado pra tras
        if(this.sprite.anims.getCurrentKey() === 'demon-attack1' && this.demonposition === "left" && this.sprite.anims.getProgress('demon-attack1') === 0.6000000000000001){
            bossatk.play({ volume: 0.3 });
            player2.setVelocityX(-125);
            player2.setVelocityY(-100);
            player2.anims.play('yang-hurt', true);
            SoulCount.valor -= 2;
        } else if(this.sprite.anims.getCurrentKey() === 'demon-attack1' && this.demonposition === "right" && this.sprite.anims.getProgress('demon-attack1') === 0.6000000000000001){
            bossatk.play({ volume: 0.3 });
            player2.setVelocityX(125);
            player2.setVelocityY(-100);
            player2.anims.play('yang-hurt', true);
            SoulCount.valor -= 2;
        }
        //se o jogador ataca o demon, o demon eh jogado um pouco pra tras. 
        else if(player2.anims.getCurrentKey() === 'yang-attack1' && player2Position==="right"){
            this.sprite.setVelocityX(150);
            this.sprite.setVelocityY(-100);
            player2.setVelocityX(0);
            this.sprite.anims.play("demon-hurt1", true);
            this.Life.valor -= 1;
        } else if(player2.anims.getCurrentKey() === 'yang-attack1' && player2Position==="left"){
            this.sprite.setVelocityX(-150);
            this.sprite.setVelocityY(-100);
            player2.setVelocityX(0);
            this.sprite.anims.play("demon-hurt1", true);
            this.Life.valor -= 1;
        } else if(player2.anims.getCurrentKey() === 'yang-attack2' && player2Position==="right"){
            this.sprite.setVelocityX(150);
            this.sprite.setVelocityY(-100);
            player2.setVelocityX(0);
            this.sprite.anims.play("demon-hurt1", true);
            this.Life.valor -= 1;
        } else if(player2.anims.getCurrentKey() === 'yang-attack2' && player2Position==="left"){
            this.sprite.setVelocityX(-150);
            this.sprite.setVelocityY(-100);
            player2.setVelocityX(0);
            this.sprite.anims.play("demon-hurt1", true);
            this.Life.valor -= 1;
        } else if(player2.anims.getCurrentKey() === 'yang-attack3' && player2Position==="right"){
            this.sprite.setVelocityX(150);
            this.sprite.setVelocityY(-100);
            player2.setVelocityX(0);
            this.sprite.anims.play("demon-hurt1", true);
            this.Life.valor -= 1;
        } else if(player2.anims.getCurrentKey() === 'yang-attack3' && player2Position==="left"){
            this.sprite.setVelocityX(-150);
            this.sprite.setVelocityY(-100);
            player2.setVelocityX(0);
            this.sprite.anims.play("demon-hurt1", true);
            this.Life.valor -= 1;
        }

    }
    //FIM DA CLASSE
}
