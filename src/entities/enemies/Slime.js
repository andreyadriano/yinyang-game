import { topLayer, topLayer2, player, player2, playerPosition, player2Position} from "../../scenes/GameScene.js";
export { Slime };

export default class Slime {
    // Cria a classe do slime

    constructor(scene, x, y, point, { gameState, audio } = {}){
        this.scene = scene;
        const anims = scene.anims;
        this.gameState = gameState;
        this.audio = audio;
        this.slimepoint = point;
        this.slimeposition = "left";
        this.Life = { valor: 20 };
        this.slimedying = 0;


        //          ANIMACOES DO SLIME

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

  this.sprite = scene.physics.add.sprite( x, y, "slime0");
  this.sprite.setSize(20,20, true).setOffset(5,4);
  this.sprite.setBounce(0);
  this.sprite.setCollideWorldBounds(true);
  this.sprite.setVelocityX(-100);
  

  
  scene.physics.add.collider(this.sprite, topLayer);
  scene.physics.add.collider(this.sprite, topLayer2);
  
  scene.physics.add.overlap(player, this.sprite, this.hitSlime, null, this);
  scene.physics.add.overlap(player2, this.sprite, this.hitSlime2, null, this);





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

        if(this.sprite.anims.getCurrentKey() === "slime-die" && this.sprite.anims.getProgress("slime-die") === 1){
          this.sprite.disableBody(true, true);
        }
        else if(this.sprite.anims.getCurrentKey() === "slime-die" && this.sprite.anims.getProgress("slime-die") < 1){
          this.sprite.setVelocity(0, 0);
          if(!this.audio.get("slimeDie").isPlaying && this.slimedying === 0){
            this.audio.get("slimeDie").play();
            this.slimedying = 1;
          }
        }
        else if(this.Life.valor <= 0){
          this.sprite.anims.play("slime-die");
        }
        else if (
          this.sprite.anims.getCurrentKey() === "slime-hurt" &&
          this.sprite.anims.getProgress("slime-hurt") < 1 && this.slimeposition === "right"
        ) {
          this.sprite.setSize(20, 20, true).setOffset(0, 4);
          this.sprite.setTint(0xff0000);
        } else if (
          this.sprite.anims.getCurrentKey() === "slime-hurt" &&
          this.sprite.anims.getProgress("slime-hurt") < 1 && this.slimeposition === "left"
        ) {
          this.sprite.setSize(20, 20, true).setOffset(0, 4);
          this.sprite.setTint(0xff0000);
        } else if (
          this.sprite.anims.getCurrentKey() === "slime-hurt" &&
          this.sprite.anims.getProgress("slime-hurt") === 1
        ) {
          this.sprite.setVelocityX(0);
          this.sprite.setSize(20, 20, true).setOffset(0, 4);
          this.sprite.clearTint();
          this.sprite.anims.play("slime-idle", true);
      
          
        } else if (this.sprite.anims.getCurrentKey() === 'slime-attack'
        && this.sprite.anims.getProgress('slime-attack') < 1 && this.slimeposition === 'left'){
            this.sprite.setSize(30,20).setOffset(-8,4);
      
        } else if (this.sprite.anims.getCurrentKey() === 'slime-attack'
        && this.sprite.anims.getProgress('slime-attack') === 1 && this.slimeposition==="left"){
            this.sprite.anims.play('slime-idle', true);
            this.sprite.setSize(20,20).setOffset(0,4);
          
        } else if (this.sprite.anims.getCurrentKey() === 'slime-attack'
        && this.sprite.anims.getProgress('slime-attack') < 1 && this.slimeposition === 'right'){
            this.sprite.setSize(30,20).setOffset(8,4);
      
        } else if (this.sprite.anims.getCurrentKey() === 'slime-attack'
        && this.sprite.anims.getProgress('slime-attack') === 1 && this.slimeposition==="right"){
            this.sprite.anims.play('slime-idle', true);
            this.sprite.setSize(20,20).setOffset(0,4);
        
        //      CONDICIONAIS PARA COMPORTAMENTO/ANIMACAO P/ PLAYER 1
        
        } else if (this.slime_P1 < 15 && this.slime_P1 > 0){
            this.sprite.setVelocityX(0);
            this.sprite.setFlipX(false);
            this.sprite.anims.play('slime-attack', true);
            this.slimeposition = 'left';
        } else if (this.slime_P1 > -20 && this.slime_P1 < 0){
            this.sprite.setVelocityX(0);
            this.sprite.setFlipX(true);
            this.sprite.anims.play('slime-attack', true);
            this.slimeposition = 'right';
        } else if (this.slime_P1 < 75 && this.slime_P1 > 0){
            this.sprite.setVelocityX(-110);
            this.sprite.setSize(20,20, true).setOffset(7,4);
            this.sprite.setFlipX(false);
            this.sprite.anims.play('slime-move', true);
            this.slimeposition = 'left';
        } else if (this.slime_P1 > -75 && this.slime_P1 < 0){
            this.sprite.setVelocityX(110);
            this.sprite.setSize(20,20, true).setOffset(7,4);
            this.sprite.setFlipX(true);
            this.sprite.anims.play('slime-move', true);
            this.slimeposition = 'right';
        } 
      
        //      CONDICIONAIS PARA COMPORTAMENTO/ANIMACAO P/ PLAYER 2
        
      else if (this.slime_P2 < 15 && this.slime_P2 > 0){
        this.sprite.setVelocityX(0);
        this.sprite.setFlipX(false);
        this.sprite.anims.play('slime-attack', true);
        this.slimeposition = 'left';
      } else if (this.slime_P2 > -20 && this.slime_P2 < 0){
        this.sprite.setVelocityX(0);
        this.sprite.setFlipX(true);
        this.sprite.anims.play('slime-attack', true);
        this.slimeposition = 'right';
      } else if (this.slime_P2 < 75 && this.slime_P2 > 0){
        this.sprite.setVelocityX(-110);
        this.sprite.setSize(20,20, true).setOffset(7,4);
        this.sprite.setFlipX(false);
        this.sprite.anims.play('slime-move', true);
        this.slimeposition = 'left';
      } else if (this.slime_P2 > -75 && this.slime_P2 < 0){
        this.sprite.setVelocityX(110);
        this.sprite.setSize(20,20, true).setOffset(7,4);
        this.sprite.setFlipX(true);
        this.sprite.anims.play('slime-move', true);
        this.slimeposition = 'right';
      }
      
        else if (this.slimeguard > 45){
            this.sprite.setVelocityX(-100);
            this.sprite.setFlipX(false);
            this.sprite.anims.play('slime-move', true);
        }
        else if (this.slimeguard < -45){
            this.sprite.setVelocityX(100);
            this.sprite.setFlipX(true);
            this.sprite.anims.play('slime-move', true);
        }
        
    //FIM DO UPDATE
    }
    
    // A FUNCAO QUE DEFINE O QUE ACONTECE QUANDO HÃ COLISAO ENTRE PLAYER E SLIME


hitSlime (player){

  if(player.anims.getCurrentKey() != "yin-die"){
  //se o jogador ataca o slime, o slime eh jogado um pouco pra tras. 
  if(player.anims.getCurrentKey() === 'yin-attack1' && playerPosition==="right"){
      this.sprite.setVelocityX(150);
      this.sprite.setVelocityY(-100);
      player.setVelocityX(0);
      this.sprite.anims.play("slime-hurt", true);
      this.Life.valor -= 1;
  } else if(player.anims.getCurrentKey() === 'yin-attack1' && playerPosition==="left"){
      this.sprite.setVelocityX(-150);
      this.sprite.setVelocityY(-100);
      player.setVelocityX(0);
      this.sprite.anims.play("slime-hurt", true);
      this.Life.valor -= 1;
  } else if(player.anims.getCurrentKey() === 'yin-attack2' && playerPosition==="right"){
      this.sprite.setVelocityX(150);
      this.sprite.setVelocityY(-100);
      player.setVelocityX(0);
      this.sprite.anims.play("slime-hurt", true);
      this.Life.valor -= 1;
  } else if(player.anims.getCurrentKey() === 'yin-attack2' && playerPosition==="left"){
      this.sprite.setVelocityX(-150);
      this.sprite.setVelocityY(-100);
      player.setVelocityX(0);
      this.sprite.anims.play("slime-hurt", true);
      this.Life.valor -= 1;
  } else if(player.anims.getCurrentKey() === 'yin-attack3' && playerPosition==="right"){
      this.sprite.setVelocityX(150);
      this.sprite.setVelocityY(-100);
      player.setVelocityX(0);
      this.sprite.anims.play("slime-hurt", true);
      this.Life.valor -= 1;
  } else if(player.anims.getCurrentKey() === 'yin-attack3' && playerPosition==="left"){
      this.sprite.setVelocityX(-150);
      this.sprite.setVelocityY(-100);
      player.setVelocityX(0);
      this.sprite.anims.play("slime-hurt", true);
      this.Life.valor -= 1;
  }
    //se o slime ataca o jogador, o jogador eh empurrado pra tras
    else if(this.sprite.anims.getCurrentKey() === 'slime-attack' && this.slimeposition === "left" && this.sprite.anims.getProgress('slime-attack') === 1){
      player.setVelocityX(-125);
      player.setVelocityY(-100);
      player.anims.play('yin-hurt', true);
      this.audio.get("slimeAttack").play({volume: 0.3});
      this.gameState.soulCount -= 5;
  } else if(this.sprite.anims.getCurrentKey() === 'slime-attack' && this.slimeposition === "right" && this.sprite.anims.getProgress('slime-attack') === 1){
      player.setVelocityX(125);
      player.setVelocityY(-100);
      player.anims.play('yin-hurt', true);
      this.audio.get("slimeAttack").play({volume: 0.3});
      this.gameState.soulCount -= 5;
  }
  }
}
hitSlime2 (player2){
  

  if(player2.anims.getCurrentKey() != "yang-die"){
  //se o jogador ataca o slime, o slime eh jogado um pouco pra tras. 
  if(player2.anims.getCurrentKey() === 'yang-attack1' && player2Position==="right"){
      this.sprite.setVelocityX(150);
      this.sprite.setVelocityY(-100);
      player2.setVelocityX(0);
      this.sprite.anims.play("slime-hurt", true);
      this.Life.valor -= 1;
  } else if(player2.anims.getCurrentKey() === 'yang-attack1' && player2Position==="left"){
      this.sprite.setVelocityX(-150);
      this.sprite.setVelocityY(-100);
      player2.setVelocityX(0);
      this.sprite.anims.play("slime-hurt", true);
      this.Life.valor -= 1;
  } else if(player2.anims.getCurrentKey() === 'yang-attack2' && player2Position==="right"){
      this.sprite.setVelocityX(150);
      this.sprite.setVelocityY(-100);
      player2.setVelocityX(0);
      this.sprite.anims.play("slime-hurt", true);
      this.Life.valor -= 1;
  } else if(player2.anims.getCurrentKey() === 'yang-attack2' && player2Position==="left"){
      this.sprite.setVelocityX(-150);
      this.sprite.setVelocityY(-100);
      player2.setVelocityX(0);
      this.sprite.anims.play("slime-hurt", true);
      this.Life.valor -= 1;
  } else if(player2.anims.getCurrentKey() === 'yang-attack3' && player2Position==="right"){
      this.sprite.setVelocityX(150);
      this.sprite.setVelocityY(-100);
      player2.setVelocityX(0);
      this.sprite.anims.play("slime-hurt", true);
      this.Life.valor -= 1;
  } else if(player2.anims.getCurrentKey() === 'yang-attack3' && player2Position==="left"){
      this.sprite.setVelocityX(-150);
      this.sprite.setVelocityY(-100);
      player2.setVelocityX(0);
      this.sprite.anims.play("slime-hurt", true);
      this.Life.valor -= 1;
  }
    //se o slime ataca o jogador, o jogador eh empurrado pra tras
    else if(this.sprite.anims.getCurrentKey() === 'slime-attack' && this.slimeposition === "left" && this.sprite.anims.getProgress('slime-attack') === 1){
      player2.setVelocityX(-125);
      player2.setVelocityY(-100);
      player2.anims.play('yang-hurt', true);
      this.audio.get("slimeAttack").play({volume: 0.3});
      this.gameState.soulCount -= 5;
  } else if(this.sprite.anims.getCurrentKey() === 'slime-attack' && this.slimeposition === "right" && this.sprite.anims.getProgress('slime-attack') === 1){
      player2.setVelocityX(125);
      player2.setVelocityY(-100);
      player2.anims.play('yang-hurt', true);
      this.audio.get("slimeAttack").play({volume: 0.3});
      this.gameState.soulCount -= 5;
  }
  }
}

// FIM DO CODIGO DA CLASSE
}