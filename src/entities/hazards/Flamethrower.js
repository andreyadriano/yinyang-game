import { applySpriteState, getSpriteState } from "../../sim/spriteState.js";

let animationsCreated = false;
function createAnimations(anims) {
  if (animationsCreated) return;
  animationsCreated = true;

  anims.create({
      key: "flamethrower-rise-low",
      frames: anims.generateFrameNumbers("flamethrower", { start: 0, end: 5 }),
      frameRate: 5
    });

  anims.create({
      key: "flamethrower-rise-high",
      frames: anims.generateFrameNumbers("flamethrower", { start: 6, end: 9 }),
      frameRate: 5
    });

  anims.create({
      key: "flamethrower-peak",
      frames: anims.generateFrameNumbers("flamethrower", { start: 10, end: 18 }),
      frameRate: 5
    });

  anims.create({
      key: "flamethrower-fall-high",
      frames: anims.generateFrameNumbers("flamethrower", { start: 19, end: 23 }),
      frameRate: 5
    });

  anims.create({
      key: "flamethrower-fall-low",
      frames: anims.generateFrameNumbers("flamethrower", { start: 24, end: 30 }),
      frameRate: 5
    });

  anims.create({
      key: "flamethrower-reload",
      frames: anims.generateFrameNumbers("flamethrower", { start: 31, end: 49 }),
      frameRate: 5
    });
}

export default class Flamethrower {

    // creates the flamethrower

    constructor(scene, x, y, delay, { gameState, group } = {}) {
        this.scene = scene;
        this.gameState = gameState;

        createAnimations(scene.anims);

        this.sprite = scene.physics.add.sprite( x, y, "flamethrower").setScale(0.9,1);
        // Add to the group first: adding resets velocity, world bounds and immovable to the group's defaults.
        group.add(this.sprite);
        this.sprite.setData("owner", this);
        this.sprite.setSize(16,14).setOffset(1, 66).setImmovable(true);

        // creates a delay between flamethrowers

        scene.time.addEvent({
            delay: delay,
            callback: () => {
                this.sprite.anims.play("flamethrower-rise-low");
            },
            repeat: 0
        });

        // END OF CONSTRUCTOR
    }

    update(){

        if(this.sprite.anims.getName() === "flamethrower-rise-high" && this.sprite.anims.getProgress("flamethrower-rise-high") === 1){
            this.sprite.anims.play("flamethrower-peak");
            this.sprite.setSize(16,50).setOffset(1,28);
        }
        else if(this.sprite.anims.getName() === "flamethrower-rise-high" && this.sprite.anims.getProgress("flamethrower-rise-high") < 1){
            this.sprite.setSize(16,50).setOffset(1,28);
        }


        if(this.sprite.anims.getName() === "flamethrower-peak" && this.sprite.anims.getProgress("flamethrower-peak") === 1){
            this.sprite.anims.play("flamethrower-fall-high");
            this.sprite.setSize(16,80).setOffset(1,-2);
        }
        else if(this.sprite.anims.getName() === "flamethrower-peak" && this.sprite.anims.getProgress("flamethrower-peak") < 1){
            this.sprite.setSize(16,80).setOffset(1,-2);
        }


        if(this.sprite.anims.getName() === "flamethrower-fall-high" && this.sprite.anims.getProgress("flamethrower-fall-high") === 1){
            this.sprite.anims.play("flamethrower-fall-low");
            this.sprite.setSize(16,50).setOffset(1,30);
        }
        else if(this.sprite.anims.getName() === "flamethrower-fall-high" && this.sprite.anims.getProgress("flamethrower-fall-high") < 1){
            this.sprite.setSize(16,50).setOffset(1,30);
        }


        if(this.sprite.anims.getName() === "flamethrower-fall-low" && this.sprite.anims.getProgress("flamethrower-fall-low") === 1){
            this.sprite.anims.play("flamethrower-reload");
            this.sprite.setSize(16,30).setOffset(1,50);
        }
        else if(this.sprite.anims.getName() === "flamethrower-fall-low" && this.sprite.anims.getProgress("flamethrower-fall-low") < 1){
            this.sprite.setSize(16,30).setOffset(1,50);
        }


        if(this.sprite.anims.getName() === "flamethrower-reload" && this.sprite.anims.getProgress("flamethrower-reload") === 1){
            this.sprite.anims.play("flamethrower-rise-low");
            this.sprite.setSize(16,14).setOffset(1, 66);
        }
        else if(this.sprite.anims.getName() === "flamethrower-reload" && this.sprite.anims.getProgress("flamethrower-reload") < 1){
            this.sprite.setSize(16,14).setOffset(1, 66);
        }


        if(this.sprite.anims.getName() === "flamethrower-rise-low" && this.sprite.anims.getProgress("flamethrower-rise-low") === 1){
            this.sprite.anims.play("flamethrower-rise-high");
            this.sprite.setSize(16,30).setOffset(1,50);
        }
        else if(this.sprite.anims.getName() === "flamethrower-rise-low" && this.sprite.anims.getProgress("flamethrower-rise-low") < 1){
            this.sprite.setSize(16,30).setOffset(1,50);
        }

        // END OF UPDATE
    }

    // The state that changes while playing, as JSON (see src/sim/snapshot.js).
    getState() {
        return getSpriteState(this.sprite);
    }

    setState(state, options) {
        applySpriteState(this.sprite, state, options);
    }

    // START OF THE DAMAGE FUNCTIONS

    handlePlayerHit(player) {
        if(this.sprite.anims.getName() != "flamethrower-reload"){
            const pushX = this.sprite.body.touching.right ? 100 : -100;

            player.takeHit(pushX, -75);
            this.gameState.loseSoul(3, this.id);
        }
    // END OF THE FUNCTION
    }

}
