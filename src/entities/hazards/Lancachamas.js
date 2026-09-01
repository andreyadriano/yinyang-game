import { player } from "../../scenes/GameScene.js";

let animationsCreated = false;
function createAnimations(anims) {
  if (animationsCreated) return;
  animationsCreated = true;

  anims.create({
      key: "chamas-baixas-subindo",
      frames: anims.generateFrameNumbers("chamas", { start: 0, end: 5 }),
      frameRate: 5
    });

  anims.create({
      key: "chamas-altas-subindo",
      frames: anims.generateFrameNumbers("chamas", { start: 6, end: 9 }),
      frameRate: 5
    });

  anims.create({
      key: "chamas-maximas",
      frames: anims.generateFrameNumbers("chamas", { start: 10, end: 18 }),
      frameRate: 5
    });

  anims.create({
      key: "chamas-altas-descendo",
      frames: anims.generateFrameNumbers("chamas", { start: 19, end: 23 }),
      frameRate: 5
    });

  anims.create({
      key: "chamas-baixas-descendo",
      frames: anims.generateFrameNumbers("chamas", { start: 24, end: 30 }),
      frameRate: 5
    });

  anims.create({
      key: "recarga",
      frames: anims.generateFrameNumbers("chamas", { start: 31, end: 49 }),
      frameRate: 5
    });
}

export default class Lancachamas {

    //cria o lança chamas

    constructor(scene, x, y, delay, { gameState, group } = {}) {
        this.scene = scene;
        this.gameState = gameState;

        createAnimations(scene.anims);

        this.sprite = scene.physics.add.sprite( x, y, "chamas").setScale(0.9,1);
        this.sprite.setSize(16,14).setOffset(1, 66).setImmovable(true);
        //cria um delay entre os lança chamas

        scene.time.addEvent({
            delay: delay,
            callback: () => {
                this.sprite.anims.play("chamas-baixas-subindo");
            },
            repeat: 0
        });
        group.add(this.sprite);
        this.sprite.setData("owner", this);

        // FIM DO CONSTRUCTOR
    }

    update(){

        if(this.sprite.anims.getCurrentKey() === "chamas-altas-subindo" && this.sprite.anims.getProgress("chamas-altas-subindo") === 1){
            this.sprite.anims.play("chamas-maximas");
            this.sprite.setSize(16,50).setOffset(1,28);
        }
        else if(this.sprite.anims.getCurrentKey() === "chamas-altas-subindo" && this.sprite.anims.getProgress("chamas-altas-subindo") < 1){
            this.sprite.setSize(16,50).setOffset(1,28);
        }


        if(this.sprite.anims.getCurrentKey() === "chamas-maximas" && this.sprite.anims.getProgress("chamas-maximas") === 1){
            this.sprite.anims.play("chamas-altas-descendo");
            this.sprite.setSize(16,80).setOffset(1,-2);
        }
        else if(this.sprite.anims.getCurrentKey() === "chamas-maximas" && this.sprite.anims.getProgress("chamas-maximas") < 1){
            this.sprite.setSize(16,80).setOffset(1,-2);
        }


        if(this.sprite.anims.getCurrentKey() === "chamas-altas-descendo" && this.sprite.anims.getProgress("chamas-altas-descendo") === 1){
            this.sprite.anims.play("chamas-baixas-descendo");
            this.sprite.setSize(16,50).setOffset(1,30);
        }  
        else if(this.sprite.anims.getCurrentKey() === "chamas-altas-descendo" && this.sprite.anims.getProgress("chamas-altas-descendo") < 1){
            this.sprite.setSize(16,50).setOffset(1,30);
        }


        if(this.sprite.anims.getCurrentKey() === "chamas-baixas-descendo" && this.sprite.anims.getProgress("chamas-baixas-descendo") === 1){
            this.sprite.anims.play("recarga");
            this.sprite.setSize(16,30).setOffset(1,50);
        }
        else if(this.sprite.anims.getCurrentKey() === "chamas-baixas-descendo" && this.sprite.anims.getProgress("chamas-baixas-descendo") < 1){
            this.sprite.setSize(16,30).setOffset(1,50);
        }


        if(this.sprite.anims.getCurrentKey() === "recarga" && this.sprite.anims.getProgress("recarga") === 1){
            this.sprite.anims.play("chamas-baixas-subindo");
            this.sprite.setSize(16,14).setOffset(1, 66);
        }
        else if(this.sprite.anims.getCurrentKey() === "recarga" && this.sprite.anims.getProgress("recarga") < 1){
            this.sprite.setSize(16,14).setOffset(1, 66);
        }


        if(this.sprite.anims.getCurrentKey() === "chamas-baixas-subindo" && this.sprite.anims.getProgress("chamas-baixas-subindo") === 1){
            this.sprite.anims.play("chamas-altas-subindo");
            this.sprite.setSize(16,30).setOffset(1,50);
        }
        else if(this.sprite.anims.getCurrentKey() === "chamas-baixas-subindo" && this.sprite.anims.getProgress("chamas-baixas-subindo") < 1){
            this.sprite.setSize(16,30).setOffset(1,50);
        }

        // FIM DO UPDATE
    }

    // INICIO DAS FUNCOES DE DANO

    handlePlayerHit(playerSprite) {
        if(this.sprite.anims.getCurrentKey() != "recarga"){
            const hurtAnim = playerSprite === player ? "yin-hurt" : "yang-hurt";
            const pushX = this.sprite.body.touching.right ? 100 : -100;

            playerSprite.anims.play(hurtAnim);
            playerSprite.setVelocityX(pushX);
            playerSprite.setVelocityY(-75);
            this.gameState.soulCount -= 3;
        }
    // FIM DA FUNCAO
    }

}