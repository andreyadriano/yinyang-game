import { GameScene } from "./GameScene.js";
export { gameover };
import {start} from "./StartScene.js";

var setupSceneInput;
var gameover = new Phaser.Scene("SceneC");
var cursors;
var youlose;

gameover.preload = function() {
  this.load.audio("youlose", "assets/sounds/sfx/you_lose.ogg");

  this.load.image("gameover", "assets/interface/gameover.png");
};
gameover.create = function() {
  //console.log("SceneA");

  this.add.image(400, 300, "gameover");

  youlose = this.sound.add("youlose");

  youlose.play();

  cursors = this.input.keyboard.createCursorKeys();
};

gameover.update = function (){
  if(cursors.space.isDown){
    youlose.play();
  }
};
