import { player, player2 } from "../../scenes/GameScene.js";
export {Jumper};

let animationsCreated = false;
function createAnimations(anims) {
  if (animationsCreated) return;
  animationsCreated = true;

  anims.create({
      key: "falling",
      frames: anims.generateFrameNumbers("jumper", { start: 0, end: 17 }),
      frameRate: 25
    });
  anims.create({
      key: "rising",
      frames: anims.generateFrameNumbers("jumper", { start: 18, end: 21 }),
      frameRate: 10
    });
  anims.create({
      key: "reload",
      frames: anims.generateFrameNumbers("jumper", { start: 22, end: 27 }),
      frameRate: 10
    });
}

export default class Jumper {
    constructor(scene, x, y, height, { group } = {}){
        this.scene = scene;
        this.bounceVelocity = height;

        createAnimations(scene.anims);

        // CREATE THE JUMPER
        this.sprite = scene.physics.add.sprite( x, y, "jumper").setScale(0.64, 1.25)
        .setSize(45, 12).setOffset(2,20);
        this.sprite.setBounce(0);
        this.sprite.setCollideWorldBounds(true);
        this.sprite.setImmovable(true);
        

        // SET UP COLLISION BETWEEN PLAYERS AND THE JUMPER
        group.add(this.sprite);

    // END OF CONSTRUCTOR
    }

    update(){
        
            if(player.body.touching.down && this.sprite.body.touching.up && this.sprite.anims.getCurrentKey() === "rising" && this.sprite.anims.getProgress("rising") === 1){
                player.setVelocityY(this.bounceVelocity);
                this.sprite.anims.play("reload");
            }
            else if(player.body.touching.down && this.sprite.body.touching.up && this.sprite.anims.getCurrentKey() === "rising" && this.sprite.anims.getProgress("rising") < 1){ 
            }

            else if(player.body.touching.down && this.sprite.body.touching.up && this.sprite.anims.getCurrentKey() === "falling" && this.sprite.anims.getProgress("falling") === 1){
            this.sprite.anims.play("rising");
            }
            else if(player.body.touching.down && this.sprite.body.touching.up && this.sprite.anims.getCurrentKey() === "falling" && this.sprite.anims.getProgress("falling") < 1){
            }

            else if (player.body.touching.down && this.sprite.body.touching.up){
                this.sprite.anims.play("falling");
            }
            if(player2.body.touching.down && this.sprite.body.touching.up && this.sprite.anims.getCurrentKey() === "rising" && this.sprite.anims.getProgress("rising") === 1){
              player2.setVelocityY(this.bounceVelocity);
              this.sprite.anims.play("reload");
            }
            else if(player2.body.touching.down && this.sprite.body.touching.up && this.sprite.anims.getCurrentKey() === "rising" && this.sprite.anims.getProgress("rising") < 1){ 
            }

            else if(player2.body.touching.down && this.sprite.body.touching.up && this.sprite.anims.getCurrentKey() === "falling" && this.sprite.anims.getProgress("falling") === 1){
            this.sprite.anims.play("rising");
            }
            else if(player2.body.touching.down && this.sprite.body.touching.up && this.sprite.anims.getCurrentKey() === "falling" && this.sprite.anims.getProgress("falling") < 1){
            }

            else if (player2.body.touching.down && this.sprite.body.touching.up){
              this.sprite.anims.play("falling");
            }
    }
// END OF THE CLASS
}
