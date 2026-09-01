import { GameScene } from "./GameScene.js";
export { credits }

var credits = new Phaser.Scene("SceneD");
var fim;

credits.preload = function (){
    this.load.image("creditsimage", "assets/interface/TelaFinal.png")
    this.load.audio("fim", "assets/sounds/bgm/ebunny_-_Life.mp3")
};

credits.create = function (){
    this.add.image(400, 300, "creditsimage");
    fim = this.sound.add("fim");
    fim.play({
        loop: true,
        volume: 0.3
    });
};
