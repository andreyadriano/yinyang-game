import { topLayer, topLayer2, topLayer3, player, player2, SoulCount, playerPosition, player2Position} from "../../scenes/GameScene.js";
import { skeletonATK, skeletonHURT, skeletonDIE} from "../../scenes/GameScene.js";
export { Skeleton };

export default class Skeleton {
    // Cria a classe do skeleton
    
    constructor(scene, x, y, point){
        this.scene = scene;
        const anims = scene.anims;
        this.skeletonpoint = point;
        this.skeletonposition = "right";
        this.Life = { valor: 50 };
        this.skltDIE = 0;
        this.skltHURT = 0;

        // VARIAVEIS PROS SONS NÃO FICAREM REPETINDO

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
        
          this.sprite = scene.physics.add.sprite( x, y, "skeleton-idle");
          this.sprite.setSize(27,27, true).setOffset(0, 6);
          this.sprite.setBounce(0);
          this.sprite.setCollideWorldBounds(true);
          this.sprite.setVelocityX(-100);
          //this.sprite.setOrigin(0.5);

          scene.physics.add.collider(this.sprite, topLayer);
          scene.physics.add.collider(this.sprite, topLayer2);
          scene.physics.add.collider(this.sprite, topLayer3);

          scene.physics.add.overlap(player, this.sprite, this.hitSkeleton, null, this)
          scene.physics.add.overlap(player2, this.sprite, this.hitSkeleton2, null, this)

          
          //FIM DO CONSTRUCTOR
    }

    update(){
    	   
			/*if(this.Life.valor != 50 || SoulCount.valor != 190){    	   
    	   console.log(this.Life.valor, SoulCount.valor);
    		}*/

			/*if(this.sprite.anims.getCurrentKey() === "skeleton-attack"){			
			console.log(this.sprite.anims.getProgress("skeleton-attack"));
			}*/

        // VARIAVEIS 
  
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


		if(this.sprite.anims.getCurrentKey() === "skeleton-die" && this.sprite.anims.getProgress("skeleton-die") === 1){
          this.sprite.disableBody(true, true);
        }
        else if(this.sprite.anims.getCurrentKey() === "skeleton-die" && this.sprite.anims.getProgress("skeleton-die") < 1){
          this.sprite.setVelocity(0, 0);
          if(!skeletonDIE.isPlaying && this.skltDIE === 0){
            skeletonDIE.play();
            this.skltDIE = 1;
          }
        }
        else if(this.Life.valor <= 0){
          this.sprite.anims.play("skeleton-die");
        }
        else if (
          this.sprite.anims.getCurrentKey() === "skeleton-hurt" &&
          this.sprite.anims.getProgress("skeleton-hurt") < 1 && this.skeletonposition === "right"
        ) {
          if(!skeletonHURT.isPlaying && this.skltHURT === 0){
            skeletonHURT.play();
            this.skltHURT = 1;
          }
          //this.sprite.setSize(20, 32, true).setOffset(0, 0);
          this.sprite.setTint(0xff0000);
        } else if (
          this.sprite.anims.getCurrentKey() === "skeleton-hurt" &&
          this.sprite.anims.getProgress("skeleton-hurt") < 1 && this.skeletonposition === "left"
        ) {
          if(!skeletonHURT.isPlaying && this.skltHURT === 0){
            skeletonHURT.play();
            this.skltHURT = 1;
          }
          //this.sprite.setSize(20, 32, true).setOffset(0, 0);
          this.sprite.setTint(0xff0000);
        } else if (
          this.sprite.anims.getCurrentKey() === "skeleton-hurt" &&
          this.sprite.anims.getProgress("skeleton-hurt") === 1
        ) {
          this.sprite.setVelocityX(0);
          //this.sprite.setSize(20, 32, true).setOffset(0, 0);
          this.sprite.clearTint();
          this.sprite.anims.play("skeleton-idle", true);
          this.skltHURT = 0;
      
        } else if (this.sprite.anims.getCurrentKey() === 'skeleton-attack'
        && this.sprite.anims.getProgress('skeleton-attack') < 0.5 && this.skeletonposition === 'left'){
            this.sprite.setSize(40,35).setOffset(-8,0);
            
        } else if (this.sprite.anims.getCurrentKey() === 'skeleton-attack'
        && this.sprite.anims.getProgress('skeleton-attack') < 1 && this.sprite.anims.getProgress('skeleton-attack') > 0.5 && this.skeletonposition === 'left'){
          this.sprite.setSize(40,35).setOffset(-8,0);
      
        } else if (this.sprite.anims.getCurrentKey() === 'skeleton-attack'
        && this.sprite.anims.getProgress('skeleton-attack') === 1 && this.skeletonposition==="left"){
            this.sprite.anims.play('skeleton-idle', true);
            this.sprite.setSize(27,27, true).setOffset(0, 6);

        } else if (this.sprite.anims.getCurrentKey() === 'skeleton-attack'
        && this.sprite.anims.getProgress('skeleton-attack') < 0.5 && this.skeletonposition === 'right'){
          this.sprite.setSize(40,35).setOffset(8,0);
          
        } else if (this.sprite.anims.getCurrentKey() === 'skeleton-attack'
        && this.sprite.anims.getProgress('skeleton-attack') < 1 && this.sprite.anims.getProgress('skeleton-attack') > 0.5 && this.skeletonposition === 'right'){
          this.sprite.setSize(40,35).setOffset(8,0);
      
        } else if (this.sprite.anims.getCurrentKey() === 'skeleton-attack'
        && this.sprite.anims.getProgress('skeleton-attack') === 1 && this.skeletonposition==="right"){
            this.sprite.anims.play('skeleton-idle', true);
            this.sprite.setSize(27,27, true).setOffset(0, 6);

        //      CONDICIONAIS PARA COMPORTAMENTO/ANIMACAO P/ PLAYER 1
        
        } else if (this.skeleton_P1 < 15 && this.skeleton_P1 > 0){
            this.sprite.setVelocityX(0);
            this.sprite.setFlipX(true);
            this.sprite.anims.play('skeleton-attack', true);
            this.skeletonposition = 'left';
        } else if (this.skeleton_P1 > -15 && this.skeleton_P1 < 0){
            this.sprite.setVelocityX(0);
            this.sprite.setFlipX(false);
            this.sprite.anims.play('skeleton-attack', true);
            this.skeletonposition = 'right';
        } else if (this.skeleton_P1 < 75 && this.skeleton_P1 > 0){
            this.sprite.setVelocityX(-110);
            this.sprite.setSize(27,27, true).setOffset(0, 6);
            this.sprite.setFlipX(true);
            this.sprite.anims.play('skeleton-walk', true);
            this.skeletonposition = 'left';
        } else if (this.skeleton_P1 > -75 && this.skeleton_P1 < 0){
            this.sprite.setVelocityX(110);
            this.sprite.setSize(27,27, true).setOffset(0, 6);;
            this.sprite.setFlipX(false);
            this.sprite.anims.play('skeleton-walk', true);
            this.skeletonposition = 'right';
        }
      
        //      CONDICIONAIS PARA COMPORTAMENTO/ANIMACAO P/ PLAYER 2
        
      else if (this.skeleton_P2 < 15 && this.skeleton_P2 > 0){
        this.sprite.setVelocityX(0);
        this.sprite.setFlipX(true);
        this.sprite.anims.play('skeleton-attack', true);
        this.skeletonposition = 'left';
      } else if (this.skeleton_P2 > -15 && this.skeleton_P2 < 0){
        this.sprite.setVelocityX(0);
        this.sprite.setFlipX(false);
        this.sprite.anims.play('skeleton-attack', true);
        this.skeletonposition = 'right';
      } else if (this.skeleton_P2 < 75 && this.skeleton_P2 > 0){
        this.sprite.setVelocityX(-110);
        this.sprite.setSize(27,27, true).setOffset(0, 6);
        this.sprite.setFlipX(true);
        this.sprite.anims.play('skeleton-walk', true);
        this.skeletonposition = 'left';
      } else if (this.skeleton_P2 > -75 && this.skeleton_P2 < 0){
        this.sprite.setVelocityX(110);
        this.sprite.setSize(27,27, true).setOffset(0, 6);
        this.sprite.setFlipX(false);
        this.sprite.anims.play('skeleton-walk', true);
        this.skeletonposition = 'right';
      }
      
        else if (this.skeletonguard > 45){
            this.sprite.setVelocityX(-100);
            this.sprite.setFlipX(true);
            this.sprite.anims.play('skeleton-walk', true);
        }
        else if (this.skeletonguard < -45){
            this.sprite.setVelocityX(100);
            this.sprite.setFlipX(false);
            this.sprite.anims.play('skeleton-walk', true);
        }
        
    //FIM DO UPDATE

    }

    // FUNCOES DE COMBATE
    hitSkeleton (player){

      if(player.anims.getCurrentKey() != "yin-die"){
      //se o jogador ataca o skeleton, o skeleton eh jogado um pouco pra tras. 
      if(player.anims.getCurrentKey() === 'yin-attack1' && playerPosition==="right"){
          this.sprite.setVelocityX(100);
          this.sprite.setVelocityY(-75);
          player.setVelocityX(0);
          this.sprite.anims.play("skeleton-hurt", true);
      	 this.Life.valor -= 1;
      } else if(player.anims.getCurrentKey() === 'yin-attack1' && playerPosition==="left"){
          this.sprite.setVelocityX(-100);
          this.sprite.setVelocityY(-75);
          player.setVelocityX(0);
          this.sprite.anims.play("skeleton-hurt", true);
          this.Life.valor -= 1;
      } else if(player.anims.getCurrentKey() === 'yin-attack2' && playerPosition==="right"){
          this.sprite.setVelocityX(100);
          this.sprite.setVelocityY(-75);
          player.setVelocityX(0);
          this.sprite.anims.play("skeleton-hurt", true);
          this.Life.valor -= 1;
      } else if(player.anims.getCurrentKey() === 'yin-attack2' && playerPosition==="left"){
          this.sprite.setVelocityX(-100);
          this.sprite.setVelocityY(-75);
          player.setVelocityX(0);
          this.sprite.anims.play("skeleton-hurt", true);
          this.Life.valor -= 1;
      } else if(player.anims.getCurrentKey() === 'yin-attack3' && playerPosition==="right"){
          this.sprite.setVelocityX(100);
          this.sprite.setVelocityY(-75);
          player.setVelocityX(0);
          this.sprite.anims.play("skeleton-hurt", true);
          this.Life.valor -= 1;
      } else if(player.anims.getCurrentKey() === 'yin-attack3' && playerPosition==="left"){
          this.sprite.setVelocityX(-100);
          this.sprite.setVelocityY(-75);
          player.setVelocityX(0);
          this.sprite.anims.play("skeleton-hurt", true);
          this.Life.valor -= 1;
      }
        //se o skeleton ataca o jogador, o jogador eh empurrado pra tras
        else if(this.sprite.anims.getCurrentKey() === 'skeleton-attack' && this.skeletonposition === "left" && this.sprite.anims.getProgress('skeleton-attack') === 0.5294117647058824){
          skeletonATK.play();
          player.setVelocityX(-125);
          player.setVelocityY(-100);
          player.anims.play('yin-hurt', true);
          //slimeatk.play();
          SoulCount.valor -= 5;
      } else if(this.sprite.anims.getCurrentKey() === 'skeleton-attack' && this.skeletonposition === "right" && this.sprite.anims.getProgress('skeleton-attack') === 0.5294117647058824){
          skeletonATK.play();
          player.setVelocityX(125);
          player.setVelocityY(-100);
          player.anims.play('yin-hurt', true);
          //slimeatk.play();
          SoulCount.valor -= 5;
      }
    }
    }
    hitSkeleton2 (player2){
      
      if(player2.anims.getCurrentKey() != "yang-die"){
      //se o jogador ataca o skeleton, o skeleton eh jogado um pouco pra tras. 
      if(player2.anims.getCurrentKey() === 'yang-attack1' && player2Position==="right"){
          this.sprite.setVelocityX(150);
          this.sprite.setVelocityY(-100);
          player2.setVelocityX(0);
          this.sprite.anims.play("skeleton-hurt", true);
          this.Life.valor -= 1;
      } else if(player2.anims.getCurrentKey() === 'yang-attack1' && player2Position==="left"){
          this.sprite.setVelocityX(-150);
          this.sprite.setVelocityY(-100);
          player2.setVelocityX(0);
          this.sprite.anims.play("skeleton-hurt", true);
      } else if(player2.anims.getCurrentKey() === 'yang-attack2' && player2Position==="right"){
          this.sprite.setVelocityX(150);
          this.sprite.setVelocityY(-100);
          player2.setVelocityX(0);
          this.sprite.anims.play("skeleton-hurt", true);
          this.Life.valor -= 1;
      } else if(player2.anims.getCurrentKey() === 'yang-attack2' && player2Position==="left"){
          this.sprite.setVelocityX(-150);
          this.sprite.setVelocityY(-100);
          player2.setVelocityX(0);
          this.sprite.anims.play("skeleton-hurt", true);
          this.Life.valor -= 1;
      } else if(player2.anims.getCurrentKey() === 'yang-attack3' && player2Position==="right"){
          this.sprite.setVelocityX(150);
          this.sprite.setVelocityY(-100);
          player2.setVelocityX(0);
          this.sprite.anims.play("skeleton-hurt", true);
          this.Life.valor -= 1;
      } else if(player2.anims.getCurrentKey() === 'yang-attack3' && player2Position==="left"){
          this.sprite.setVelocityX(-150);
          this.sprite.setVelocityY(-100);
          player2.setVelocityX(0);
          this.sprite.anims.play("skeleton-hurt", true);
          this.Life.valor -= 1;
      }
        //se o skeleton ataca o jogador, o jogador eh empurrado pra tras
        else if(this.sprite.anims.getCurrentKey() === 'skeleton-attack' && this.skeletonposition === "left" && this.sprite.anims.getProgress('skeleton-attack') === 0.5294117647058824){
          skeletonATK.play();
          player2.setVelocityX(-125);
          player2.setVelocityY(-100);
          player2.anims.play('yang-hurt', true);
          SoulCount.valor -= 5;
      } else if(this.sprite.anims.getCurrentKey() === 'skeleton-attack' && this.skeletonposition === "right" && this.sprite.anims.getProgress('skeleton-attack') === 0.5294117647058824){
          skeletonATK.play();
          player2.setVelocityX(125);
          player2.setVelocityY(-100);
          player2.anims.play('yang-hurt', true);
          SoulCount.valor -= 5;
      }
    }
    }

}
