import { player, player2 } from "../../scenes/GameScene.js";
export {Jumper};

let animationsCreated = false;
function createAnimations(anims) {
  if (animationsCreated) return;
  animationsCreated = true;

  anims.create({
      key: "descendo",
      frames: anims.generateFrameNumbers("jumper", { start: 0, end: 17 }),
      frameRate: 25
    });
  anims.create({
      key: "subindo",
      frames: anims.generateFrameNumbers("jumper", { start: 18, end: 21 }),
      frameRate: 10
    });
  anims.create({
      key: "recarga2",
      frames: anims.generateFrameNumbers("jumper", { start: 22, end: 27 }),
      frameRate: 10
    });
}

export default class Jumper {
    constructor(scene, x, y, height, { group } = {}){
        this.scene = scene;
        this.velocidade = height;

        createAnimations(scene.anims);

        // CRIA O JUMPER
        this.sprite = scene.physics.add.sprite( x, y, "jumper").setScale(0.64, 1.25)
        .setSize(45, 12).setOffset(2,20);
        this.sprite.setBounce(0);
        this.sprite.setCollideWorldBounds(true);
        this.sprite.setImmovable(true);
        

        //CRIA COLISAO ENTRE PLAYERS E JUMPER
        group.add(this.sprite);

    // FIM DO CONSTRUCTOR
    }

    update(){
        
            if(player.body.touching.down && this.sprite.body.touching.up && this.sprite.anims.getCurrentKey() === "subindo" && this.sprite.anims.getProgress("subindo") === 1){
                player.setVelocityY(this.velocidade);
                this.sprite.anims.play("recarga2");
            }
            else if(player.body.touching.down && this.sprite.body.touching.up && this.sprite.anims.getCurrentKey() === "subindo" && this.sprite.anims.getProgress("subindo") < 1){ 
            }

            else if(player.body.touching.down && this.sprite.body.touching.up && this.sprite.anims.getCurrentKey() === "descendo" && this.sprite.anims.getProgress("descendo") === 1){
            this.sprite.anims.play("subindo");
            }
            else if(player.body.touching.down && this.sprite.body.touching.up && this.sprite.anims.getCurrentKey() === "descendo" && this.sprite.anims.getProgress("descendo") < 1){
            }

            else if (player.body.touching.down && this.sprite.body.touching.up){
                this.sprite.anims.play("descendo");
            }
            if(player2.body.touching.down && this.sprite.body.touching.up && this.sprite.anims.getCurrentKey() === "subindo" && this.sprite.anims.getProgress("subindo") === 1){
              player2.setVelocityY(this.velocidade);
              this.sprite.anims.play("recarga2");
            }
            else if(player2.body.touching.down && this.sprite.body.touching.up && this.sprite.anims.getCurrentKey() === "subindo" && this.sprite.anims.getProgress("subindo") < 1){ 
            }

            else if(player2.body.touching.down && this.sprite.body.touching.up && this.sprite.anims.getCurrentKey() === "descendo" && this.sprite.anims.getProgress("descendo") === 1){
            this.sprite.anims.play("subindo");
            }
            else if(player2.body.touching.down && this.sprite.body.touching.up && this.sprite.anims.getCurrentKey() === "descendo" && this.sprite.anims.getProgress("descendo") < 1){
            }

            else if (player2.body.touching.down && this.sprite.body.touching.up){
              this.sprite.anims.play("descendo");
            }
    }
// FIM DA CLASSE
}
