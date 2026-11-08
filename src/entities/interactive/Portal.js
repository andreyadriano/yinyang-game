export {Portal};

let animationsCreated = false;
function createAnimations(anims) {
  if (animationsCreated) return;
  animationsCreated = true;

  anims.create({
    key: "portal1Spin",
    frames: anims.generateFrameNumbers("portal1", { start: 0, end: 19 }),
    frameRate: 9,
    repeat: -1
  });
  anims.create({
    key: "portal2Spin",
    frames: anims.generateFrameNumbers("portal2", { start: 0, end: 19 }),
    frameRate: 9,
    repeat: -1
  });
  anims.create({
    key: "neutralPortalSpin",
    frames: anims.generateFrameNumbers("neutralPortal", {start: 0, end: 8}),
    frameRate: 9,
    repeat: -1
  });
}

export default class Portal {
    constructor(scene, x, y, DX, DY, type, { audio, group } = {}){
        this.scene = scene;
        this.audio = audio;
        this.destinationX = DX;
        this.destinationY = DY;
        this.portalType = type;

        createAnimations(scene.anims);

        // CREATE THE PORTAL
        if(this.portalType === 1){
        this.sprite = scene.physics.add.sprite( x, y, "portal1");
        this.sprite.setSize(15, 30);
        }
        if(this.portalType === 2){
        this.sprite = scene.physics.add.sprite( x, y, "portal2");
        this.sprite.setSize(15, 30);
        }
        if(this.portalType === 3){
        this.sprite = scene.physics.add.sprite( x, y, "neutralPortal");
        this.sprite.setSize(20, 30);
        }
        // Add to the group first: adding resets velocity, world bounds and immovable to the group's defaults.
        group.add(this.sprite);
        this.sprite.setData("owner", this);
        this.sprite.setBounce(0);
        this.sprite.setCollideWorldBounds(true);
        this.sprite.setImmovable(true);

        // END OF CONSTRUCTOR
    }

    update(){
      if(this.portalType === 1 && this.sprite.anims.getName() != "portal1Spin"){
        this.sprite.anims.play("portal1Spin", true);
      }
      if(this.portalType === 2 && this.sprite.anims.getName() != "portal2Spin"){
        this.sprite.anims.play("portal2Spin", true);
      }
      if(this.portalType === 3 && this.sprite.anims.getName() != "neutralPortalSpin"){
        this.sprite.anims.play("neutralPortalSpin", true);
      }
    }
    
    teleport(playerSprite){
      playerSprite.setPosition(this.destinationX, this.destinationY);
      this.audio.play("portal");
    }
    // END OF THE CLASS
  }