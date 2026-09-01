import { GameScene } from "./GameScene.js";
export { start };

var setupSceneInput;
var start = new Phaser.Scene("SceneA");

start.preload = function() {
  this.load.audio("starttheme", ["assets/sounds/bgm/MenuMusic.mp3"]);

  this.load.image("Start", "assets/interface/start.png");
};
start.create = function() {
  //console.log("SceneA");

  this.add.image(400, 300, "Start");

  var starttheme = this.sound.add("starttheme");

  starttheme.play({
    loop: true,
    volume: 0.3
  });

  if (this.sound.locked) {
    this.sound.once(
      "unlocked",
      function(soundManager) {
        setupSceneInput.call(this, starttheme);
      },
      this
    );
  } else {
    setupSceneInput.call(this, starttheme);
  }
};

setupSceneInput = function(starttheme) {
  this.input.once(
    "pointerup",
    function() {
      starttheme.stop();
      this.scene.start(GameScene);
    },
    this
  );
};
