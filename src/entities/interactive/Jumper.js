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
        for (const player of this.scene.players) {
            this.bounce(player.sprite);
        }
    }

    // Steps the jumper's animation chain while a player stands on it, and launches the player at the end.
    bounce(playerSprite){
        const standing = playerSprite.body.touching.down && this.sprite.body.touching.up;
        if (!standing) return;

        const key = this.sprite.anims.getCurrentKey();
        if (key === "rising") {
            if (this.sprite.anims.getProgress("rising") === 1) {
                playerSprite.setVelocityY(this.bounceVelocity);
                this.sprite.anims.play("reload");
            }
        } else if (key === "falling") {
            if (this.sprite.anims.getProgress("falling") === 1) {
                this.sprite.anims.play("rising");
            }
        } else {
            this.sprite.anims.play("falling");
        }
    }
// END OF THE CLASS
}
