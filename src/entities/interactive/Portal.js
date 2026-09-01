export {Portal};

let animationsCreated = false;
function createAnimations(anims) {
  if (animationsCreated) return;
  animationsCreated = true;

  anims.create({
    key: "portal1girando",
    frames: anims.generateFrameNumbers("portal1", { start: 0, end: 19 }),
    frameRate: 9,
    repeat: -1
  });
  anims.create({
    key: "portal2girando",
    frames: anims.generateFrameNumbers("portal2", { start: 0, end: 19 }),
    frameRate: 9,
    repeat: -1
  });
  anims.create({
    key: "portalneutro",
    frames: anims.generateFrameNumbers("portalNeutro", {start: 0, end: 8}),
    frameRate: 9,
    repeat: -1
  });
}

export default class Portal {
    constructor(scene, x, y, DX, DY, tipo, { audio, group } = {}){
        this.scene = scene;
        this.audio = audio;
        this.destinoX = DX;
        this.destinoY = DY;
        this.tipodeportal = tipo;

        createAnimations(scene.anims);

        // CRIA O PORTAL
        if(this.tipodeportal === 1){
        this.sprite = scene.physics.add.sprite( x, y, "portal1");
        this.sprite.setSize(15, 30);
        }
        if(this.tipodeportal === 2){
        this.sprite = scene.physics.add.sprite( x, y, "portal2");
        this.sprite.setSize(15, 30);
        }
        if(this.tipodeportal === 3){
        this.sprite = scene.physics.add.sprite( x, y, "portalNeutro");
        this.sprite.setSize(20, 30);
        }
        this.sprite.setBounce(0);
        this.sprite.setCollideWorldBounds(true);
        this.sprite.setImmovable(true);

        // CRIA COLISAO DO PORTAL
        group.add(this.sprite);
        this.sprite.setData("owner", this);

        // FIM DO CONSTRUCTOR
    }

    update(){
      if(this.tipodeportal === 1 && this.sprite.anims.getCurrentKey() != "portal1girando"){
        this.sprite.anims.play("portal1girando", true);
      }
      if(this.tipodeportal === 2 && this.sprite.anims.getCurrentKey() != "portal2girando"){
        this.sprite.anims.play("portal2girando", true);
      }
      if(this.tipodeportal === 3 && this.sprite.anims.getCurrentKey() != "portalneutro"){
        this.sprite.anims.play("portalneutro", true);
      }
    }
    
    teleport(playerSprite){
      playerSprite.setPosition(this.destinoX, this.destinoY);
      this.audio.get("portal").play();
    }
    // FIM DA CLASSE
  }