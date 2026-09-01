import { SCENE_KEYS } from "./sceneKeys.js";
import { GameState } from "../core/GameState.js";
import { AudioManager } from "../core/AudioManager.js";
import { Player } from "../entities/player/Player.js";
import Lancachamas from "../entities/hazards/Lancachamas.js";
import { Slime } from "../entities/enemies/Slime.js";
import {Skeleton} from "../entities/enemies/Skeleton.js";
import {Jumper} from "../entities/interactive/Jumper.js";
import {Portal} from "../entities/interactive/Portal.js";
import {Demon} from "../entities/enemies/Demon.js";

export { spike, player, player2, playerPosition, player2Position };
export { topLayer, topLayer2, topLayer3 }

/*
  Coordenadas para teleporte:

  Da sala escondida para o easter egg: 1744, 2573
  Do easter egg, dos portais, das chaves e de um dos bosses para a posição default: 1312, 1440
  Dos portais para boss 1: 96, 3616
  Dos portais para boss 2: 4000, 3616
  PRIMEIRO PORTAL NEUTRO: 3770, 1666
  SEGUNDO PORTAL NEUTRO: 2330, 1924
  Do portal neutro para posição default: 1307, 1443
  

*/

//VARIAVEIS DO PLAYER 1
var player;
var playerPosition = "right"; // se o player ta virado pra esquerda ou direita

// VARIAVEIS DO PLAYER 2
var player2;
var player2Position = "right";

// VARIAVEL DA VIDA
var Soul;

// MONSTROS
var slime = {p1: null, p2: null, p3: null, p4: null,
  p5: null, p6: null, p7: null, p8: null, p9: null,
  p10: null, p11: null, p12: null, p13: null,
  p14: null, p15: null, p16: null, p17: null,
  p18: null, p19: null, p20:null, p21:null, p22:null,
  p23:null, p24:null, p25:null, p26:null, p27:null,
  p28:null, p29:null, p30:null, p31:null, p32:null, p33:null, p34:null, p35:null};
  
  var skeleton = {p1: null, p2: null, p3: null, p4: null,
  p5: null, p6: null, p7: null, p8: null, p9: null,
  p10: null, p11: null, p12: null, p13: null,
  p14: null, p15: null, p16: null, p17: null,
  p18: null, p19: null, p20:null, p21:null, p22:null,
  p23:null, p24:null, p25:null, p26:null, p27:null,
  p28:null, p29:null, p30:null, p31:null, p32:null, p33:null, p34:null, p35:null};
  
  var demon = {p1: null, p2: null};

var cursors; //variavel das setas do teclado
var keyW;
var keyA;
var keyS;
var keyD;
var keyP;
var keyENTER;


// Variavel dos objetos do mapa

var spike; //variavel dos espinhos
var barreira1;
var barreira2;
var JailDoor;
var portal = {p1: null, p2: null, p3: null, p4: null, p5: null, p6: null, p7: null, p8:null};

var ChaveAmarela;
var ChaveAzul;

var graphics; //nem me pergunte
var button;

//Variavel do lança-chamas
var chamas = {p1: null, p2: null, p3: null, p4: null,
  p5: null, p6: null, p7: null, p8: null, p9: null,
  p10: null, p11: null, p12: null, p13: null,
  p14: null, p15: null, p16: null, p17: null,
  p18: null, p19: null, p20:null, p21:null, p22:null,
  p23:null, p24:null, p25:null, p26:null, p27:null,
  p28:null, p29:null, p30:null, p31:null, p32:null, p33:null, p34:null, p35:null};
  //Variavel do jumper
  var jumper = {p1: null, p2: null, p3: null, p4: null, p5: null, p6: null, p7: null,
  p8: null, p9: null, p10: null, p11: null, p12:null};


var topLayer;
var topLayer2;
var topLayer3;
var topLayer4;
var topLayer5;
var topLayer6;
var topLayer7;
var topLayer8;
var topLayer9;


export class GameScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.GAME);
  }

// A FUNCAO PRELOAD FAZ O PRECARREGAMENTO DE IMAGENS E SONS DO JOGO
preload() {

  //Assets do ambiente e dos objetos
  
  this.load.image("caverna","assets/ambiente/tilesets/cavernaSemfundo.png");
  this.load.image("cavernaFundo","assets/ambiente/tilesets/cavernaFundo.png");
  this.load.image("superficie","assets/ambiente/tilesets/superficie.png");
  this.load.image("background","assets/ambiente/tilesets/background.png");
  this.load.image("background2","assets/ambiente/tilesets/background2.png");
  this.load.image("environment","assets/ambiente/tilesets/environment.png");
  this.load.image("ground","assets/ambiente/tilesets/ground.png");
  this.load.image("madeiras","assets/ambiente/tilesets/madeiras.png");
  this.load.image("Easter Egg", "assets/ambiente/tilesets/Easter Egg.png");
  this.load.tilemapTiledJSON("fase1", "assets/ambiente/Fase1.2.json");
  
  

  // ASSETS DO LANÇA-CHAMAS
  this.load.spritesheet("chamas", "assets/ambiente/Lança-chamas.png", {frameWidth: 17, frameHeight: 80});
  
  // ESPINHOS  
  this.load.image("spike", "assets/ambiente/spikes_1.png");

  //ASSETS DO JUMPER
  this.load.spritesheet("jumper", "assets/ambiente/jumper.png", {frameWidth: 48, frameHeight: 32});  

  // ASSETS DOS PORTAIS
  this.load.spritesheet("portal1", "assets/ambiente/Portal 1.png", {frameWidth: 33, frameHeight: 33});
  this.load.spritesheet("portal2", "assets/ambiente/Portal 2.png", {frameWidth: 33, frameHeight: 33});
  this.load.spritesheet("portalNeutro", "assets/ambiente/Portal Neutro.png", {frameWidth: 33, frameHeight: 33});

  // ASSETS DA BARREIRA 1
  this.load.spritesheet("barreira1open", "assets/ambiente/OpeningBarrier1.png", {frameWidth: 32, frameHeight: 32});
  this.load.spritesheet("barreira1idle", "assets/ambiente/IdleBarrier1.png", {frameWidth: 32, frameHeight: 32});
  // ASSETS DA CHAVE AMARELA
  this.load.spritesheet("chaveamarela", "assets/ambiente/chaveamarela.png", {frameWidth: 32, frameHeight: 32});

  // ASSETS DA BARREIRA 2
  this.load.spritesheet("barreira2open", "assets/ambiente/OpeningBarrier2.png", {frameWidth: 32, frameHeight: 32});
  this.load.spritesheet("barreira2idle", "assets/ambiente/IdleBarrier2.png", {frameWidth: 32, frameHeight: 32});
  // ASSETS DA CHAVE AZUL
  this.load.spritesheet("chaveazul", "assets/ambiente/chaveazul.png", {frameWidth: 32, frameHeight: 32});
  
  //ASSET DA JAILDOOR
  this.load.spritesheet("jaildoor", "assets/ambiente/jaildoor.png", {frameWidth: 200, frameHeight: 200});


  //Assets do Jogador Yin

  //Carregando o spritesheet de corrida 
  this.load.spritesheet("yinrun", "assets/player/YinRun.png", {
    frameWidth: 50,
    frameHeight: 37
  });
  //Carregando as demais animações em um único spritesheet
  this.load.spritesheet("yin", "assets/player/YinSpriteSheet.png", {
    frameWidth: 50,
    frameHeight: 37
  });

  //Assets do jogador Yang
  this.load.spritesheet("yangrun", "assets/player/YangRun.png", {
    frameWidth: 50,
    frameHeight: 37
  });
  //Carregando as demais animações em um único spritesheet
  this.load.spritesheet("yang", "assets/player/YangSpriteSheet.png", {
    frameWidth: 50,
    frameHeight: 37
  });

  // ASSETS DA VIDA DO PERSONAGEM
  this.load.spritesheet("soul", "assets/interface/VIDA(190hits).png", { frameWidth:  31, frameHeight: 31});


  //SPRITESHEET DO SLIME
  this.load.spritesheet('slimesheet', 'assets/slime/slime-Sheet.png', { frameWidth: 32, frameHeight: 25 });
  this.load.image('slime0', 'assets/slime/slime0.png');

  //ASSETS DO SKELETON
  this.load.spritesheet('skeleton-attack', 'assets/skeleton/skeleton-attack.png', {frameWidth: 43, frameHeight: 37});
  this.load.spritesheet('skeleton-die', 'assets/skeleton/skeleton-die.png', {frameWidth: 33, frameHeight: 32});
  this.load.spritesheet('skeleton-hurt', 'assets/skeleton/skeleton-hurt.png', {frameWidth: 30, frameHeight: 32});
  this.load.spritesheet('skeleton-idle', 'assets/skeleton/skeleton-idle.png', {frameWidth: 24, frameHeight: 32});
  this.load.spritesheet('skeleton-walk', 'assets/skeleton/skeleton-walk.png', {frameWidth: 22, frameHeight: 33});

  // ASSETS DO BOSS
  this.load.spritesheet("demon-attack1", "assets/demon/demon-attack_1.png", {frameWidth: 240, frameHeight: 192});
  this.load.spritesheet("demon-attack2", "assets/demon/demon-attack_2.png", {frameWidth: 240, frameHeight: 192});
  this.load.spritesheet("demon-idle1", "assets/demon/demon-idle_1.png", {frameWidth: 160, frameHeight: 144});
  this.load.spritesheet("demon-idle2", "assets/demon/demon-idle_2.png", {frameWidth: 160, frameHeight: 144});



  //PRELOAD DE AUDIOS
  this.load.audio("song", "assets/sounds/bgm/ebunny_-_Art_of_War.mp3");
  this.load.audio("swordwoosh", "assets/sounds/sfx/battle/swordwoosh.mp3");
  this.load.audio("slimeatk", "assets/sounds/sfx/battle/slime-attack.mp3");
  this.load.audio("jumping", "assets/sounds/sfx/movement/jump1.mp3");
  this.load.audio("landing", "assets/sounds/sfx/movement/landing1.mp3");
  this.load.audio("portalsound", "assets/sounds/sfx/SFX_Portal.mp3");
  this.load.audio("JaildoorOpeningSound", "assets/sounds/sfx/SFX_PortaDeCela.mp3");
  this.load.audio("JumperSound", "assets/sounds/sfx/SFX_Trampolim.mp3");

  this.load.audio("BossAtk", "assets/sounds/sfx/BossAtk.mp3");
  this.load.audio("BossDying", "assets/sounds/sfx/BossDying.mp3");
  this.load.audio("SkeletonAtk", "assets/sounds/sfx/SkeletonAtk.mp3");
  this.load.audio("SkeletonDie", "assets/sounds/sfx/SkeletonDying.mp3");
  this.load.audio("SkeletonHurt", "assets/sounds/sfx/SkeletonHurt.mp3");
  this.load.audio("SlimeDying", "assets/sounds/sfx/SlimeDying.mp3");
  this.load.audio("chave", "assets/sounds/sfx/Chaves.mp3"); //Efeito sonoro pra quando o player pegar as chaves.


  //ICONE DE FULLSCREEN
  this.load.spritesheet("fullscreen", "assets/fullscreen.png", {
    frameWidth: 64,
    frameHeight: 64
  });

// FIM DO PRELOAD
}

// A FUNCAO CREATE CRIA AS COISAS DENTRO DO JOGO
create() {

  this.state = new GameState();
  this.audio = new AudioManager(this);

  // CRIACAO DOS SONS
  this.audio.add("music", "song");
  this.audio.add("swordWoosh", "swordwoosh");
  this.audio.add("jump", "jumping");
  this.audio.add("landing", "landing");
  this.audio.add("portal", "portalsound");
  this.audio.add("jailDoorOpening", "JaildoorOpeningSound");

  this.audio.add("bossAttack", "BossAtk");
  this.audio.add("bossDie", "BossDying");
  this.audio.add("skeletonAttack", "SkeletonAtk");
  this.audio.add("skeletonDie", "SkeletonDie");
  this.audio.add("skeletonHurt", "SkeletonHurt");
  this.audio.add("slimeDie", "SlimeDying");
  this.audio.add("slimeAttack", "slimeatk");
  this.audio.add("keyPickup", "chave");


  //toca musica em loop
  this.audio.get("music").play({
    loop: true,
    volume: 0.1
  });


  // CRIACAO DO CENARIO E DO BACKGROUND
  
  var map = this.add.tilemap("fase1");

  
  var terrain = map.addTilesetImage("cavernaSemfundo", "caverna");
  var terrain2 = map.addTilesetImage("superficie", "superficie");
  var terrain3 = map.addTilesetImage("background", "background");
  var terrain4 = map.addTilesetImage("background2", "background2");
  var terrain5 = map.addTilesetImage("madeiras", "madeiras");
  var terrain6 = map.addTilesetImage("ground", "ground");
  var terrain7 = map.addTilesetImage("environment", "environment");
  var terrain8 = map.addTilesetImage("cavernaFundo", "cavernaFundo");
  var terrain9 = map.addTilesetImage("Easter Egg", "Easter Egg");


  //criando os niveis do mapa

    topLayer3 = map.createStaticLayer("topLayer3", [terrain3], 0, 0);
    topLayer4 = map.createStaticLayer("topLayer4", [terrain4], 0, 0);

    // CRIACAO DOS ESPINHOS
    spike = this.physics.add.staticGroup();
    spike.create(590, 490, "spike");
    spike.create(992, 410, "spike").setScale(1.3).setSize(150,20);
    spike.create(2188, 1670, "spike").setScale(1.3).setSize(115,20).setOffset(-6,-1);
    spike.create(2314, 1670, "spike").setScale(1.3).setSize(115,20).setOffset(-6,-1);
    spike.create(2440, 1670, "spike").setScale(1.3).setSize(115,20).setOffset(-6,-1);
    spike.create(2566, 1670, "spike").setScale(1.3).setSize(115,20).setOffset(-6,-1);
    spike.create(3710, 890, "spike").setScale(1.3).setSize(115,20).setOffset(-6,-1);
    spike.create(3836, 890, "spike").setScale(1.3).setSize(115,20).setOffset(-6,-1);
    spike.create(3962, 890, "spike").setScale(1.3).setSize(115,18).setOffset(-6,2);
    spike.create(1820, 2263, "spike").setScale(1.3).setSize(115,20).setOffset(-6,-1);
    spike.create(1946, 2263, "spike").setScale(1.3).setSize(115,20).setOffset(-6,-1);
    spike.create(2072, 2263, "spike").setScale(1.3).setSize(115,20).setOffset(-6,-1);
    spike.create(2198, 2263, "spike").setScale(1.3).setSize(115,20).setOffset(-6,-1);
    spike.create(2326, 2263, "spike").setScale(1.3).setSize(115,20).setOffset(-6,-1);
    spike.create(2452, 2263, "spike").setScale(1.3).setSize(115,20).setOffset(-6,-1);
    spike.create(3456, 1880, "spike");
    

    //FIM DA CRIAÇAO DE ESPINHOS

    topLayer = map.createStaticLayer("topLayer", [terrain], 0, 0);
    topLayer2 = map.createStaticLayer("topLayer2", [terrain2], 0, 0);
    topLayer5 = map.createStaticLayer("topLayerCastle1", [terrain5]);
    topLayer7 = map.createStaticLayer("topLayerCastle3", [terrain7]);
    topLayer9 = map.createStaticLayer("EasterEgg", [terrain9]);

    // CRIACAO DA BARREIRA 1
    barreira1 = this.physics.add.sprite(2735, 1895, "barreira1idle").setScale(1.5, 2);
    barreira1.setSize(20, 32).setOffset(6, 0);
    barreira1.setBounce(0);
    barreira1.setCollideWorldBounds(true);
    barreira1.setImmovable(true);

    // CRIACAO DA CHAVE AMARELA
    ChaveAmarela = this.physics.add.sprite(3700, 1520, "chaveamarela");
    ChaveAmarela.setBounce(0);
    ChaveAmarela.setCollideWorldBounds(true);
    ChaveAmarela.setImmovable(true);
    ChaveAmarela.setSize(20,20);

    // CRIACAO DA BARREIRA 2
    barreira2 = this.physics.add.sprite(2735, 2100, "barreira2idle").setScale(1.5, 2);
    barreira2.setSize(20, 32).setOffset(6, 0);
    barreira2.setBounce(0);
    barreira2.setCollideWorldBounds(true);
    barreira2.setImmovable(true);

    // CRIACAO DA CHAVE AZUL
    ChaveAzul = this.physics.add.sprite(3830, 1500, "chaveazul");
    ChaveAzul.setBounce(0);
    ChaveAzul.setCollideWorldBounds(true);
    ChaveAzul.setImmovable(true);
    ChaveAzul.setSize(20,20);

    // CRIACAO DA JAILDOOR
    JailDoor = this.physics.add.sprite(2703, 1011, "jaildoor");
    JailDoor.setScale(0.5).setSize(40, 160).setOffset(40, 40);
    JailDoor.setBounce(0);
    JailDoor.setCollideWorldBounds(true);
    JailDoor.setImmovable(true);

  // ADICAO DO TECLADO

  cursors = this.input.keyboard.createCursorKeys();
  keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
  keyA= this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
  keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
  keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
  keyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
  keyENTER = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

  // CRIACAO DO JOGADOR 1
  this.player1 = new Player(this, {
    x: 100,
    y: 350,
    spriteKey: "yin",
    controls: { up: cursors.up, down: cursors.down, left: cursors.left, right: cursors.right, attack: keyENTER },
    groundLayers: [topLayer, topLayer2],
    audio: this.audio
  });
  player = this.player1.sprite;

  // CRIACAO DO JOGADOR 2
  this.player2 = new Player(this, {
    x: 75,
    y: 350,
    spriteKey: "yang",
    controls: { up: keyW, down: keyS, left: keyA, right: keyD, attack: cursors.space },
    groundLayers: [topLayer, topLayer2],
    audio: this.audio
  });
  player2 = this.player2.sprite;

  Soul = this.add
  .image(20, 20, "soul")
  .setOrigin(0.5)
  .setScrollFactor(0).setScale(1.5);

  // CRIACAO DOS PORTAIS

  portal.p1 = new Portal(this, 2825, 1927, 96, 3616, 1, { audio: this.audio });
  portal.p2 = new Portal(this, 2825, 2100, 4000, 3616, 2, { audio: this.audio });
  portal.p3 = new Portal(this, 3770, 1666, 1307, 1443, 3, { audio: this.audio });
  portal.p4 = new Portal(this, 2330, 1924, 1307, 1443, 3, { audio: this.audio });
  portal.p5 = new Portal(this, 1257, 2167, 1744, 2573, 3, { audio: this.audio });
  portal.p6 = new Portal(this, 2051, 2599, 1307, 1443, 3, { audio: this.audio });
  portal.p7 = new Portal(this, 860, 2480, 1307, 1443, 3, { audio: this.audio });
  portal.p8 = new Portal(this, 2938, 2910, 1307, 1443, 3, { audio: this.audio });
 
  // CRIAÇAO DOS LANÇA-CHAMAS

  chamas.p1 = new Lancachamas(this, 1624, 1120, 0, { gameState: this.state });
  chamas.p2 = new Lancachamas(this, 1608, 1120, 0, { gameState: this.state });
  chamas.p3 = new Lancachamas(this, 1480, 1476, 0, { gameState: this.state });
  chamas.p4 = new Lancachamas(this, 1656, 1476, 5100, { gameState: this.state });
  chamas.p5 = new Lancachamas(this, 1832, 1476, 0, { gameState: this.state });
  chamas.p6 = new Lancachamas(this, 184, 1940, 0, { gameState: this.state });
  chamas.p7 = new Lancachamas(this, 263, 1940, 2550, { gameState: this.state });
  chamas.p8 = new Lancachamas(this, 392, 2167, 0, { gameState: this.state });
  chamas.p9 = new Lancachamas(this, 584, 2167, 5100, { gameState: this.state });
  chamas.p10 = new Lancachamas(this, 776, 2167, 0, { gameState: this.state });
  chamas.p11 = new Lancachamas(this, 968, 2167, 5100, { gameState: this.state });
  chamas.p12 = new Lancachamas(this, 1576, 2245, 0, { gameState: this.state });
  chamas.p13 = new Lancachamas(this, 1624, 2245, 5100, { gameState: this.state });
  chamas.p14 = new Lancachamas(this, 1672, 2245, 5100, { gameState: this.state });
  chamas.p15 = new Lancachamas(this, 1720, 2245, 0, { gameState: this.state });
  chamas.p16 = new Lancachamas(this, 1992, 2071, 5100, { gameState: this.state });
  chamas.p17 = new Lancachamas(this, 2008, 2071, 5100, { gameState: this.state });
  chamas.p18 = new Lancachamas(this, 2568, 1351, 0, { gameState: this.state });
  chamas.p19 = new Lancachamas(this, 2568, 1551, 0, { gameState: this.state });
  chamas.p20 = new Lancachamas(this, 3368, 1123, 0, { gameState: this.state });
  chamas.p21 = new Lancachamas(this, 3864, 1170, 0, { gameState: this.state });
  chamas.p22 = new Lancachamas(this, 3704, 1170, 0, { gameState: this.state });
  chamas.p23 = new Lancachamas(this, 824, 2995, 0, { gameState: this.state });
  chamas.p24 = new Lancachamas(this, 760, 2960, 5100, { gameState: this.state });
  chamas.p25 = new Lancachamas(this, 488, 2960, 0, { gameState: this.state });
  chamas.p26 = new Lancachamas(this, 200, 3055, 5100, { gameState: this.state });
  chamas.p27 = new Lancachamas(this, 88, 3055, 5100, { gameState: this.state });
  chamas.p28 = new Lancachamas(this, 2984, 3105, 0, { gameState: this.state });
  chamas.p29 = new Lancachamas(this, 2984, 3125, 5100, { gameState: this.state });
  chamas.p30 = new Lancachamas(this, 3304, 3125, 5100, { gameState: this.state });
  chamas.p31 = new Lancachamas(this, 3304, 3105, 0, { gameState: this.state });
  chamas.p32 = new Lancachamas(this, 3592, 3335, 0, { gameState: this.state });
  chamas.p33 = new Lancachamas(this, 3592, 3115, 5100, { gameState: this.state });
  chamas.p34 = new Lancachamas(this, 3848, 1938, 0, { gameState: this.state });
  
  // CRIACAO DOS JUMPERS
  
  jumper.p1 = new Jumper(this, 496, 1815, -900);
  jumper.p2 = new Jumper(this, 624, 1527, -900);
  jumper.p3 = new Jumper(this, 1136, 2183, -900);
  jumper.p4 = new Jumper(this, 4048, 2487, -900);
  jumper.p5 = new Jumper(this, 3744, 2263, -900);
  jumper.p6 = new Jumper(this, 3936, 1943, -1200);
  jumper.p7 = new Jumper(this, 144, 3159, -1500);
  jumper.p8 = new Jumper(this, 2496, 3334, -1200);
  jumper.p9 = new Jumper(this, 2240, 3655, -1200);
  jumper.p10 = new Jumper(this, 1328, 3335, -1200);
  jumper.p11 = new Jumper(this, 1584, 3655, -1200);
  jumper.p12 = new Jumper(this, 3889, 3330, -1200);
  
  // CRIACAO DOS SLIMES
  
  slime.p1 = new Slime(this, 400, 350, 400, { gameState: this.state, audio: this.audio });
  slime.p2 = new Slime(this, 800, 350, 800, { gameState: this.state, audio: this.audio });
  slime.p3 = new Slime(this, 1200, 350, 1200, { gameState: this.state, audio: this.audio });
  slime.p4 = new Slime(this, 3144, 3150, 3144, { gameState: this.state, audio: this.audio });
  slime.p5 = new Slime(this, 3470, 3310, 3470, { gameState: this.state, audio: this.audio });
  slime.p6 = new Slime(this, 345, 930, 350, { gameState: this.state, audio: this.audio });
  slime.p7 = new Slime(this, 997, 930, 997, { gameState: this.state, audio: this.audio });
  slime.p8 = new Slime(this, 480, 2160, 480, { gameState: this.state, audio: this.audio });
  slime.p9 = new Slime(this, 854, 2160, 854, { gameState: this.state, audio: this.audio });
  slime.p10 = new Slime(this, 1559, 1460, 1559, { gameState: this.state, audio: this.audio });
  slime.p11 = new Slime(this, 3200, 1330, 3200, { gameState: this.state, audio: this.audio });
  slime.p12 = new Slime(this, 1043, 1570, 1043, { gameState: this.state, audio: this.audio });
  slime.p13 = new Slime(this, 3782, 1150, 3782, { gameState: this.state, audio: this.audio });
  slime.p14 = new Slime(this, 1426, 3630, 1426, { gameState: this.state, audio: this.audio });
  slime.p15 = new Slime(this, 625, 2950, 625, { gameState: this.state, audio: this.audio });
  slime.p16 = new Slime(this, 3449, 2320, 3449, { gameState: this.state, audio: this.audio });
  slime.p17 = new Slime(this, 3726, 2465, 3726, { gameState: this.state, audio: this.audio });
  
  // CRIACAO DOS SKELETONS
  
  skeleton.p1 = new Skeleton(this, 683, 2160, 683, { gameState: this.state, audio: this.audio });
  skeleton.p2 = new Skeleton(this, 3142, 3310, 3142, { gameState: this.state, audio: this.audio });
  skeleton.p3 = new Skeleton(this, 3467, 3150, 3467, { gameState: this.state, audio: this.audio });
  skeleton.p4 = new Skeleton(this, 470, 1200, 470, { gameState: this.state, audio: this.audio });
  skeleton.p5 = new Skeleton(this, 1763, 1120, 1763, { gameState: this.state, audio: this.audio });
  skeleton.p6 = new Skeleton(this, 1749, 1460, 1749, { gameState: this.state, audio: this.audio });
  skeleton.p7 = new Skeleton(this, 1485, 2225, 1485, { gameState: this.state, audio: this.audio });
  skeleton.p8 = new Skeleton(this, 971, 3630, 971, { gameState: this.state, audio: this.audio });
  skeleton.p9 = new Skeleton(this, 1136, 3630, 1136, { gameState: this.state, audio: this.audio });
  skeleton.p10 = new Skeleton(this, 975, 3015, 975, { gameState: this.state, audio: this.audio });
  skeleton.p11 = new Skeleton(this, 360, 2875, 360, { gameState: this.state, audio: this.audio });
  skeleton.p12 = new Skeleton(this, 3901, 2465, 3901, { gameState: this.state, audio: this.audio });

  // CRIACAO DOS BOSSES DEMONS
  
  demon.p1 = new Demon(this, 3400, 2910, 3300, { gameState: this.state, audio: this.audio });
  demon.p2 = new Demon(this, 640, 2464, 640, { gameState: this.state, audio: this.audio });

  topLayer6 = map.createStaticLayer("topLayerCastle2", [terrain6]);
  topLayer8 = map.createStaticLayer("LayerSecreto", [terrain8]);


  //pointer = this.input.addPointer(1);

  // ADICIONANDO COLISAO AO JOGO

  // LAYERS
  topLayer.setCollisionByProperty({ collides: true });
  topLayer2.setCollisionByProperty({ collides: true });
  // BARREIRAS
  this.physics.add.collider(barreira1, topLayer);
  this.physics.add.collider(barreira1, topLayer2);
  this.physics.add.collider(barreira2, topLayer);
  this.physics.add.collider(barreira2, topLayer2);
  this.physics.add.collider(player, barreira1, Barreira1OPEN, null, this);
  this.physics.add.collider(player, barreira2, Barreira2OPEN, null, this);
  this.physics.add.collider(player2, barreira1, Barreira1OPEN2, null, this);
  this.physics.add.collider(player2, barreira2, Barreira2OPEN2, null, this);
  // JAILDOOR
  this.physics.add.collider(JailDoor, topLayer);
  this.physics.add.collider(JailDoor, topLayer2);
  this.physics.add.collider(player, JailDoor, OpenJailDoor1, null, this);
  this.physics.add.collider(player2, JailDoor, OpenJailDoor2, null, this);


  // CHAVES
  this.physics.add.collider(ChaveAmarela, topLayer);
  this.physics.add.collider(ChaveAmarela, topLayer2);
  this.physics.add.collider(ChaveAzul, topLayer);
  this.physics.add.collider(ChaveAzul, topLayer2);
  this.physics.add.overlap(player, ChaveAmarela, ColetarChaveAM1, null, this);
  this.physics.add.overlap(player2, ChaveAmarela, ColetarChaveAM2, null, this);
  this.physics.add.overlap(player, ChaveAzul, ColetarChaveAZ1, null, this);
  this.physics.add.overlap(player2, ChaveAzul, ColetarChaveAZ2, null, this);

  // ESPINHOS
  this.physics.add.overlap(player, spike, hitSpike, null, this);
  this.physics.add.overlap(player2, spike, hitSpike2, null, this);

  // VIDA

  
  // SISTEMA DE CAMERAS
  
this.cameras.main.setBounds(0, 0, 4096, 4096).setSize(800, 300); //limites da camera
this.physics.world.setBounds(0, 0, 4096, 4096); //limites do mundo

this.cameras.main.startFollow(player2, true, 0.5, 0.5);
this.cameras.add(0, 300, 800, 300).startFollow(player, true, 0.5, 0.5).setBounds(0, 150, 4096, 4096);
  
  // CODIGO PARA IMPLEMENTAR FULLSCREEN

  var FKey = this.input.keyboard.addKey("F");

  FKey.on(
    "down",
    function() {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
      }
    },
    this
  );

  // ANIMACOES DO PLAYER
  this.anims.create({
    key: "yin-idle",
    frames: this.anims.generateFrameNumbers("yin", { start: 38, end: 41 }),
    frameRate: 5,
    repeat: -1
  });

  this.anims.create({
    key: "yin-die",
    frames: this.anims.generateFrameNumbers("yin", { start: 59, end: 68 }),
    frameRate: 5,
    repeat: -1
  });

  this.anims.create({
    key: "yin-run",
    frames: this.anims.generateFrameNumbers("yinrun", { start: 0, end: 5 }),
    frameRate: 10,
    repeat: -1
  });

  this.anims.create({
    key: "yin-jump",
    frames: this.anims.generateFrameNumbers("yin", { start: 14, end: 17 }),
    frameRate: 8,
    repeat: 0
  });

  this.anims.create({
    key: "yin-fall",
    frames: this.anims.generateFrameNumbers("yin", { start: 22, end: 23 }),
    frameRate: 5,
    repeat: -1
  });

  this.anims.create({
    key: "yin-crouch",
    frames: this.anims.generateFrameNumbers("yin", { start: 4, end: 7 }),
    frameRate: 7,
    repeat: -1
  });

  this.anims.create({
    key: "yin-attack1",
    frames: this.anims.generateFrameNumbers("yin", { start: 42, end: 46 }),
    frameRate: 20,
    delay: 100
  });

  this.anims.create({
    key: "yin-attack2",
    frames: this.anims.generateFrameNumbers("yin", { start: 47, end: 52 }),

    frameRate: 20,
    delay: 100
  });

  this.anims.create({
    key: "yin-attack3",
    frames: this.anims.generateFrameNumbers("yin", { start: 53, end: 58 }),
    frameRate: 20,
    delay: 100
  });

  this.anims.create({
    key: "yin-hurt",
    frames: this.anims.generateFrameNumbers("yin", { start: 59, end: 61 }),
    frameRate: 9,
    repeat: -1
  });

  // ANIMACOES DO PLAYER 2
  this.anims.create({
    key: "yang-idle",
    frames: this.anims.generateFrameNumbers("yang", { start: 38, end: 41 }),
    frameRate: 5,
    repeat: -1
  });

  this.anims.create({
    key: "yang-die",
    frames: this.anims.generateFrameNumbers("yang", { start: 59, end: 68 }),
    frameRate: 5,
    repeat: -1
  });

  this.anims.create({
    key: "yang-run",
    frames: this.anims.generateFrameNumbers("yangrun", { start: 0, end: 5 }),
    frameRate: 10,
    repeat: -1
  });

  this.anims.create({
    key: "yang-jump",
    frames: this.anims.generateFrameNumbers("yang", { start: 14, end: 17 }),
    frameRate: 8,
    repeat: 0
  });

  this.anims.create({
    key: "yang-fall",
    frames: this.anims.generateFrameNumbers("yang", { start: 22, end: 23 }),
    frameRate: 5,
    repeat: -1
  });

  this.anims.create({
    key: "yang-crouch",
    frames: this.anims.generateFrameNumbers("yang", { start: 4, end: 7 }),
    frameRate: 7,
    repeat: -1
  });

  this.anims.create({
    key: "yang-attack1",
    frames: this.anims.generateFrameNumbers("yang", { start: 42, end: 46 }),
    frameRate: 20,
    delay: 100
  });

  this.anims.create({
    key: "yang-attack2",
    frames: this.anims.generateFrameNumbers("yang", { start: 47, end: 52 }),

    frameRate: 20,
    delay: 100
  });

  this.anims.create({
    key: "yang-attack3",
    frames: this.anims.generateFrameNumbers("yang", { start: 53, end: 58 }),
    frameRate: 20,
    delay: 100
  });

  this.anims.create({
    key: "yang-hurt",
    frames: this.anims.generateFrameNumbers("yang", { start: 59, end: 61 }),
    frameRate: 9,
    repeat: -1
  });

  //ANIMACOES DA BARREIRA 1
  this.anims.create({
    key: "barreira1idle",
    frames: this.anims.generateFrameNumbers("barreira1idle", { start: 0, end: 11 }),
    frameRate: 9,
    repeat: -1
  });
  
  this.anims.create({
    key: "barreira1open",
    frames: this.anims.generateFrameNumbers("barreira1open", { start: 0, end: 6 }),
    frameRate: 7,
    repeat: 0
  });

    // ANIMACOES DA BARREIRA 2
  this.anims.create({
    key: "barreira2idle",
    frames: this.anims.generateFrameNumbers("barreira2idle", { start: 0, end: 11 }),
    frameRate: 9,
    repeat: -1
  });
  this.anims.create({
    key: "barreira2open",
    frames: this.anims.generateFrameNumbers("barreira2open", { start: 0, end: 6 }),
    frameRate: 7,
    repeat: 0
  });

  // ANIMACOES DAS CHAVES

  this.anims.create({
    key: "ChaveAmarela",
    frames: this.anims.generateFrameNumbers("chaveamarela", { start: 0, end: 6}),
    frameRate: 7,
    repeat: -1
  });
  this.anims.create({
    key: "ChaveAzul",
    frames: this.anims.generateFrameNumbers("chaveazul", { start: 0, end: 9}),
    frameRate: 9,
    repeat: -1
  });

  // ANIMACAO DA JAILDOOR
  this.anims.create({
    key: "JailDoor_Opening",
    frames: this.anims.generateFrameNumbers("jaildoor", {start:0, end: 8}),
    frameRate: 7,
    repeat: 0
  });

// FIM DO CREATE
}

// A FUNCAO UPDATE EH A QUE FAZ O JOGO ACONTECER, ELA SE REPETE INFINITAMENTE VÃRIAS VEZES POR SEGUNDO
update(time, delta) {

jumper.p1.update();
jumper.p2.update();
jumper.p3.update();
jumper.p4.update();
jumper.p5.update();
jumper.p6.update();
jumper.p7.update();
jumper.p8.update();
jumper.p9.update();
jumper.p10.update();
jumper.p11.update();
jumper.p12.update();

slime.p1.update();
slime.p2.update();
slime.p3.update();
slime.p4.update();
slime.p5.update();
slime.p6.update();
slime.p7.update();
slime.p8.update();
slime.p9.update();
slime.p10.update();
slime.p11.update();
slime.p12.update();
slime.p13.update();
slime.p14.update();
slime.p15.update();
slime.p16.update();
slime.p17.update();


skeleton.p1.update();
skeleton.p2.update();
skeleton.p3.update();
skeleton.p4.update();
skeleton.p5.update();
skeleton.p6.update();
skeleton.p7.update();
skeleton.p8.update();
skeleton.p9.update();
skeleton.p10.update();
skeleton.p11.update();
skeleton.p12.update();

demon.p1.update();
demon.p2.update();

chamas.p1.update();
chamas.p2.update();
chamas.p3.update();
chamas.p4.update();
chamas.p5.update();
chamas.p6.update();
chamas.p7.update();
chamas.p8.update();
chamas.p9.update();
chamas.p10.update();
chamas.p11.update();
chamas.p12.update();
chamas.p13.update();
chamas.p14.update();
chamas.p15.update();
chamas.p16.update();
chamas.p17.update();
chamas.p18.update();
chamas.p19.update();
chamas.p20.update();
chamas.p21.update();
chamas.p22.update();
chamas.p23.update();
chamas.p24.update();
chamas.p25.update();
chamas.p26.update();
chamas.p27.update();
chamas.p28.update();
chamas.p29.update();
chamas.p30.update();
chamas.p31.update();
chamas.p32.update();
chamas.p33.update();
chamas.p34.update();

  portal.p1.update();
  portal.p2.update();
  portal.p3.update();
  portal.p4.update();
  portal.p5.update();
  portal.p6.update();
  portal.p7.update();
  portal.p8.update();


    // GAMEOVER
    if (this.state.isGameOver === true) {
      this.audio.get("music").stop();
      this.player1.forceDeath();
      this.player2.forceDeath();
    }
    if(this.state.isEndgame === true){
      this.audio.get("music").stop();
      this.physics.pause();
      this.scene.start(SCENE_KEYS.CREDITS);
    }

    // VIDA
    if (this.state.soulCount > 0 && this.state.soulCount <= 190){
      Soul.setFrame(this.state.soulCount)
    }
    else if(this.state.soulCount <= 0){
      this.state.isGameOver = true;
    }

    // ANIMACAO DA JAILDOOR
    if (JailDoor.anims.getCurrentKey() === "JailDoor_Opening" && JailDoor.anims.getProgress("JailDoor_Opening") < 1){
      //JailDoor.disableBody();
    }
    else if(JailDoor.anims.getCurrentKey() === "JailDoor_Opening" && JailDoor.anims.getProgress("JailDoor_Opening") === 1){
      this.state.isEndgame = true;
      JailDoor.disableBody();
    }

    // ANIMACAO DA CHAVE AMARELA
    if(ChaveAmarela.anims.getCurrentKey() != "ChaveAmarela" && this.state.hasYellowKey === false){
      ChaveAmarela.anims.play("ChaveAmarela", true);
    }
    // ANIMACAO DA CHAVE AZUL
    if(ChaveAzul.anims.getCurrentKey() != "ChaveAzul" && this.state.hasBlueKey === false){
      ChaveAzul.anims.play("ChaveAzul", true);
    }

    // ANIMACAO DA BARREIRA 1
    if(barreira1.anims.getCurrentKey() === "barreira1open" && barreira1.anims.getProgress("barreira1open") === 1){
      barreira1.disableBody(true, true);
    }
    else if(barreira1.anims.getCurrentKey() === "barreira1open" && barreira1.anims.getProgress("barreira1open") < 1){
    }
    else if(barreira1.anims.getCurrentKey() != "barreira1idle" && barreira1.anims.getCurrentKey() != "barreira1open" && this.state.isBarrier1Open === false){
      barreira1.anims.play("barreira1idle", true);
    }

    // ANIMACAO DA BARREIRA 2
    if(barreira2.anims.getCurrentKey() === "barreira2open" && barreira2.anims.getProgress("barreira2open") === 1){
      barreira2.disableBody(true, true);
    }
    else if(barreira2.anims.getCurrentKey() === "barreira2open" && barreira2.anims.getProgress("barreira2open") < 1){
    }
    else if(barreira2.anims.getCurrentKey() != "barreira2idle" && barreira2.anims.getCurrentKey() != "barreira2open" && this.state.isBarrier2Open === false){
      barreira2.anims.play("barreira2idle", true);
    }


    //          PLAYER ANIMATIONS

    if (keyP.isDown) {
      console.log(player.body.position.x, player.body.position.y, this.state.bossesDefeated, JailDoor.anims.getCurrentKey(), this.state.isEndgame, this.state.isGameOver);
    }

    this.player1.update(time, delta);
    this.player2.update(time, delta);
    playerPosition = this.player1.position;
    player2Position = this.player2.position;

// FIM DO UPDATE
  }
}



// FUNCOES DE DANO DOS ESPINHOS

function hitSpike(player, spike) {

  player.setTint(0xff0000);
  if(player.anims.getCurrentKey() != "yin-die"){
  player.anims.play("yin-hurt");
  player.setVelocityY(-420);
  this.state.soulCount -= 4;
  }
};

function hitSpike2(player2, spike) {

  player2.setTint(0xff0000);
  if(player2.anims.getCurrentKey() != "yang-die"){
  player2.anims.play("yang-hurt");
  player2.setVelocityY(-420);
  this.state.soulCount -= 4;
  }
};

function Barreira1OPEN(player, barreira1){
  if(this.state.isBarrier1Open === false && this.state.hasYellowKey === true){
    barreira1.anims.play("barreira1open");
    this.state.hasYellowKey = false;
  }
}

function Barreira2OPEN(player, barreira2){
  if(this.state.isBarrier2Open === false && this.state.hasBlueKey === true){
    barreira2.anims.play("barreira2open");
    this.state.hasBlueKey = false;
  }
}
function Barreira1OPEN2(player2, barreira1){
  if(this.state.isBarrier1Open === false && this.state.hasYellowKey === true){
    barreira1.anims.play("barreira1open");
    this.state.hasYellowKey = false;
  }
}
function Barreira2OPEN2(player2, barreira2){
  if(this.state.isBarrier2Open === false && this.state.hasBlueKey === true){
    barreira2.anims.play("barreira2open");
    this.state.hasBlueKey = false;
  }
}

function ColetarChaveAM1(player, ChaveAmarela){
  this.state.hasYellowKey = true;
  this.audio.get("keyPickup").play();
  ChaveAmarela.disableBody(true, true);
}
function ColetarChaveAM2(player2, ChaveAmarela){
  this.state.hasYellowKey = true;
  this.audio.get("keyPickup").play();
  ChaveAmarela.disableBody(true, true);
}
function ColetarChaveAZ1(player, ChaveAzul){
  this.state.hasBlueKey = true;
  this.audio.get("keyPickup").play();
  ChaveAzul.disableBody(true, true);
}
function ColetarChaveAZ2(player2, ChaveAzul){
  this.state.hasBlueKey = true;
  this.audio.get("keyPickup").play();
  ChaveAzul.disableBody(true, true);
}

// FUNCOES DE ABERTURA DA JAILDOOR
function OpenJailDoor1(player, JailDoor){
	if(this.state.bossesDefeated === 2){
  if(JailDoor.anims.getCurrentKey() != "JailDoor_Opening"){
    JailDoor.anims.play("JailDoor_Opening", true);
  }
  if(!this.audio.get("jailDoorOpening").isPlaying){
    this.audio.get("jailDoorOpening").play();
  }
  }
}
function OpenJailDoor2(player2, JailDoor){
	if(this.state.bossesDefeated === 2){
  if(JailDoor.anims.getCurrentKey() != "JailDoor_Opening"){
    JailDoor.anims.play("JailDoor_Opening", true);
  }
  if(!this.audio.get("jailDoorOpening").isPlaying){
    this.audio.get("jailDoorOpening").play();
  }
  }
}
