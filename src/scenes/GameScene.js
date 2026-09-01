import { SCENE_KEYS } from "./sceneKeys.js";
import { GameState } from "../core/GameState.js";
import { AudioManager } from "../core/AudioManager.js";
import { Player } from "../entities/player/Player.js";
import Flamethrower from "../entities/hazards/Flamethrower.js";
import { Slime } from "../entities/enemies/Slime.js";
import {Skeleton} from "../entities/enemies/Skeleton.js";
import {Jumper} from "../entities/interactive/Jumper.js";
import {Portal} from "../entities/interactive/Portal.js";
import {Demon} from "../entities/enemies/Demon.js";
import { LEVEL_SPAWNS } from "../data/levelSpawns.js";

export { spike, player, player2, playerPosition, player2Position };
export { topLayer, topLayer2, topLayer3 }

/*
  Teleport coordinates:

  From the hidden room to the easter egg: 1744, 2573
  From the easter egg, the portals, the keys, and one of the bosses to the default position: 1312, 1440
  From the portals to boss 1: 96, 3616
  From the portals to boss 2: 4000, 3616
  FIRST NEUTRAL PORTAL: 3770, 1666
  SECOND NEUTRAL PORTAL: 2330, 1924
  From the neutral portal to the default position: 1307, 1443


*/

// PLAYER 1 VARIABLES
var player;
var playerPosition = "right"; // whether the player is facing left or right

// PLAYER 2 VARIABLES
var player2;
var player2Position = "right";

// HEALTH VARIABLE
var Soul;

var cursors; // keyboard arrow keys
var keyW;
var keyA;
var keyS;
var keyD;
var keyP;
var keyENTER;


// Map object variables

var spike; // spikes
var barrier1;
var barrier2;
var JailDoor;

var yellowKey;
var blueKey;

var graphics; // don't even ask
var button;



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

// PRELOAD LOADS THE GAME'S IMAGES AND SOUNDS
preload() {

  // Environment and object assets

  this.load.image("cave","assets/environment/tilesets/cave.png");
  this.load.image("caveBackground","assets/environment/tilesets/caveBackground.png");
  this.load.image("surface","assets/environment/tilesets/surface.png");
  this.load.image("background","assets/environment/tilesets/background.png");
  this.load.image("background2","assets/environment/tilesets/background2.png");
  this.load.image("environment","assets/environment/tilesets/environment.png");
  this.load.image("ground","assets/environment/tilesets/ground.png");
  this.load.image("wood","assets/environment/tilesets/wood.png");
  this.load.image("Easter Egg", "assets/environment/tilesets/Easter Egg.png");
  this.load.tilemapTiledJSON("level1", "assets/environment/level1.json");



  // FLAMETHROWER ASSETS
  this.load.spritesheet("flamethrower", "assets/environment/flamethrower.png", {frameWidth: 17, frameHeight: 80});

  // SPIKES
  this.load.image("spike", "assets/environment/spikes_1.png");

  // JUMPER ASSETS
  this.load.spritesheet("jumper", "assets/environment/jumper.png", {frameWidth: 48, frameHeight: 32});

  // PORTAL ASSETS
  this.load.spritesheet("portal1", "assets/environment/Portal 1.png", {frameWidth: 33, frameHeight: 33});
  this.load.spritesheet("portal2", "assets/environment/Portal 2.png", {frameWidth: 33, frameHeight: 33});
  this.load.spritesheet("neutralPortal", "assets/environment/NeutralPortal.png", {frameWidth: 33, frameHeight: 33});

  // BARRIER 1 ASSETS
  this.load.spritesheet("barrier1Open", "assets/environment/OpeningBarrier1.png", {frameWidth: 32, frameHeight: 32});
  this.load.spritesheet("barrier1Idle", "assets/environment/IdleBarrier1.png", {frameWidth: 32, frameHeight: 32});
  // YELLOW KEY ASSETS
  this.load.spritesheet("yellowKey", "assets/environment/yellowKey.png", {frameWidth: 32, frameHeight: 32});

  // BARRIER 2 ASSETS
  this.load.spritesheet("barrier2Open", "assets/environment/OpeningBarrier2.png", {frameWidth: 32, frameHeight: 32});
  this.load.spritesheet("barrier2Idle", "assets/environment/IdleBarrier2.png", {frameWidth: 32, frameHeight: 32});
  // BLUE KEY ASSETS
  this.load.spritesheet("blueKey", "assets/environment/blueKey.png", {frameWidth: 32, frameHeight: 32});

  // JAILDOOR ASSET
  this.load.spritesheet("jaildoor", "assets/environment/jaildoor.png", {frameWidth: 200, frameHeight: 200});


  // Yin player assets

  // Loading the run spritesheet
  this.load.spritesheet("yinrun", "assets/player/YinRun.png", {
    frameWidth: 50,
    frameHeight: 37
  });
  // Loading the remaining animations in a single spritesheet
  this.load.spritesheet("yin", "assets/player/YinSpriteSheet.png", {
    frameWidth: 50,
    frameHeight: 37
  });

  // Yang player assets
  this.load.spritesheet("yangrun", "assets/player/YangRun.png", {
    frameWidth: 50,
    frameHeight: 37
  });
  // Loading the remaining animations in a single spritesheet
  this.load.spritesheet("yang", "assets/player/YangSpriteSheet.png", {
    frameWidth: 50,
    frameHeight: 37
  });

  // CHARACTER HEALTH ASSETS
  this.load.spritesheet("soul", "assets/interface/health(190hits).png", { frameWidth:  31, frameHeight: 31});


  // SLIME SPRITESHEET
  this.load.spritesheet('slimesheet', 'assets/slime/slime-Sheet.png', { frameWidth: 32, frameHeight: 25 });
  this.load.image('slime0', 'assets/slime/slime0.png');

  // SKELETON ASSETS
  this.load.spritesheet('skeleton-attack', 'assets/skeleton/skeleton-attack.png', {frameWidth: 43, frameHeight: 37});
  this.load.spritesheet('skeleton-die', 'assets/skeleton/skeleton-die.png', {frameWidth: 33, frameHeight: 32});
  this.load.spritesheet('skeleton-hurt', 'assets/skeleton/skeleton-hurt.png', {frameWidth: 30, frameHeight: 32});
  this.load.spritesheet('skeleton-idle', 'assets/skeleton/skeleton-idle.png', {frameWidth: 24, frameHeight: 32});
  this.load.spritesheet('skeleton-walk', 'assets/skeleton/skeleton-walk.png', {frameWidth: 22, frameHeight: 33});

  // BOSS ASSETS
  this.load.spritesheet("demon-attack1", "assets/demon/demon-attack_1.png", {frameWidth: 240, frameHeight: 192});
  this.load.spritesheet("demon-attack2", "assets/demon/demon-attack_2.png", {frameWidth: 240, frameHeight: 192});
  this.load.spritesheet("demon-idle1", "assets/demon/demon-idle_1.png", {frameWidth: 160, frameHeight: 144});
  this.load.spritesheet("demon-idle2", "assets/demon/demon-idle_2.png", {frameWidth: 160, frameHeight: 144});



  // AUDIO PRELOAD
  this.load.audio("song", "assets/sounds/bgm/ebunny_-_Art_of_War.mp3");
  this.load.audio("swordwoosh", "assets/sounds/sfx/battle/swordwoosh.mp3");
  this.load.audio("slimeatk", "assets/sounds/sfx/battle/slime-attack.mp3");
  this.load.audio("jumping", "assets/sounds/sfx/movement/jump1.mp3");
  this.load.audio("landing", "assets/sounds/sfx/movement/landing1.mp3");
  this.load.audio("portalsound", "assets/sounds/sfx/SFX_Portal.mp3");
  this.load.audio("JaildoorOpeningSound", "assets/sounds/sfx/jailDoorOpening.mp3");
  this.load.audio("JumperSound", "assets/sounds/sfx/jumperBounce.mp3");

  this.load.audio("BossAtk", "assets/sounds/sfx/BossAtk.mp3");
  this.load.audio("BossDying", "assets/sounds/sfx/BossDying.mp3");
  this.load.audio("SkeletonAtk", "assets/sounds/sfx/SkeletonAtk.mp3");
  this.load.audio("SkeletonDie", "assets/sounds/sfx/SkeletonDying.mp3");
  this.load.audio("SkeletonHurt", "assets/sounds/sfx/SkeletonHurt.mp3");
  this.load.audio("SlimeDying", "assets/sounds/sfx/SlimeDying.mp3");
  this.load.audio("keyPickupSound", "assets/sounds/sfx/keyPickup.mp3"); // sound for when the player picks up a key


  // FULLSCREEN ICON
  this.load.spritesheet("fullscreen", "assets/fullscreen.png", {
    frameWidth: 64,
    frameHeight: 64
  });

// END OF PRELOAD
}

// CREATE BUILDS EVERYTHING INSIDE THE GAME
create() {

  this.state = new GameState();
  this.audio = new AudioManager(this);

  // SOUND CREATION
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
  this.audio.add("keyPickup", "keyPickupSound");


  // play music on loop
  this.audio.get("music").play({
    loop: true,
    volume: 0.1
  });


  // SCENERY AND BACKGROUND CREATION
  
  var map = this.add.tilemap("level1");

  
  var terrain = map.addTilesetImage("cave", "cave");
  var terrain2 = map.addTilesetImage("surface", "surface");
  var terrain3 = map.addTilesetImage("background", "background");
  var terrain4 = map.addTilesetImage("background2", "background2");
  var terrain5 = map.addTilesetImage("wood", "wood");
  var terrain6 = map.addTilesetImage("ground", "ground");
  var terrain7 = map.addTilesetImage("environment", "environment");
  var terrain8 = map.addTilesetImage("caveBackground", "caveBackground");
  var terrain9 = map.addTilesetImage("Easter Egg", "Easter Egg");


  // creating the map layers

    topLayer3 = map.createStaticLayer("topLayer3", [terrain3], 0, 0);
    topLayer4 = map.createStaticLayer("topLayer4", [terrain4], 0, 0);

    // SPIKE CREATION
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
    

    // END OF SPIKE CREATION

    topLayer = map.createStaticLayer("topLayer", [terrain], 0, 0);
    topLayer2 = map.createStaticLayer("topLayer2", [terrain2], 0, 0);
    topLayer5 = map.createStaticLayer("topLayerCastle1", [terrain5]);
    topLayer7 = map.createStaticLayer("topLayerCastle3", [terrain7]);
    topLayer9 = map.createStaticLayer("EasterEgg", [terrain9]);

    // BARRIER 1 CREATION
    barrier1 = this.physics.add.sprite(2735, 1895, "barrier1Idle").setScale(1.5, 2);
    barrier1.setSize(20, 32).setOffset(6, 0);
    barrier1.setBounce(0);
    barrier1.setCollideWorldBounds(true);
    barrier1.setImmovable(true);

    // YELLOW KEY CREATION
    yellowKey = this.physics.add.sprite(3700, 1520, "yellowKey");
    yellowKey.setBounce(0);
    yellowKey.setCollideWorldBounds(true);
    yellowKey.setImmovable(true);
    yellowKey.setSize(20,20);

    // BARRIER 2 CREATION
    barrier2 = this.physics.add.sprite(2735, 2100, "barrier2Idle").setScale(1.5, 2);
    barrier2.setSize(20, 32).setOffset(6, 0);
    barrier2.setBounce(0);
    barrier2.setCollideWorldBounds(true);
    barrier2.setImmovable(true);

    // BLUE KEY CREATION
    blueKey = this.physics.add.sprite(3830, 1500, "blueKey");
    blueKey.setBounce(0);
    blueKey.setCollideWorldBounds(true);
    blueKey.setImmovable(true);
    blueKey.setSize(20,20);

    // JAILDOOR CREATION
    JailDoor = this.physics.add.sprite(2703, 1011, "jaildoor");
    JailDoor.setScale(0.5).setSize(40, 160).setOffset(40, 40);
    JailDoor.setBounce(0);
    JailDoor.setCollideWorldBounds(true);
    JailDoor.setImmovable(true);

  // KEYBOARD SETUP

  cursors = this.input.keyboard.createCursorKeys();
  keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
  keyA= this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
  keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
  keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
  keyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
  keyENTER = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

  // PLAYER 1 CREATION
  this.player1 = new Player(this, {
    x: 100,
    y: 350,
    spriteKey: "yin",
    controls: { up: cursors.up, down: cursors.down, left: cursors.left, right: cursors.right, attack: keyENTER },
    groundLayers: [topLayer, topLayer2],
    audio: this.audio
  });
  player = this.player1.sprite;

  // PLAYER 2 CREATION
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

  // PHYSICS GROUPS PER ENEMY/OBJECT TYPE
  // One collider/overlap per group instead of one per instance; each entity
  // adds itself to the group and tags sprite.setData("owner", this) in its constructor.
  const resolveOwner = (playerSprite, entitySprite) => entitySprite.getData("owner").handlePlayerHit(playerSprite);

  this.slimeGroup = this.physics.add.group();
  this.physics.add.collider(this.slimeGroup, [topLayer, topLayer2]);
  this.physics.add.overlap([player, player2], this.slimeGroup, resolveOwner, null, this);

  this.skeletonGroup = this.physics.add.group();
  this.physics.add.collider(this.skeletonGroup, [topLayer, topLayer2, topLayer3]);
  this.physics.add.overlap([player, player2], this.skeletonGroup, resolveOwner, null, this);

  this.demonGroup = this.physics.add.group();
  this.physics.add.collider(this.demonGroup, [topLayer, topLayer2, topLayer3]);
  this.physics.add.overlap([player, player2], this.demonGroup, resolveOwner, null, this);

  this.flamethrowerGroup = this.physics.add.group();
  this.physics.add.collider(this.flamethrowerGroup, topLayer);
  this.physics.add.collider([player, player2], this.flamethrowerGroup, resolveOwner, null, this);

  this.portalGroup = this.physics.add.group();
  this.physics.add.collider(this.portalGroup, [topLayer, topLayer2]);
  this.physics.add.overlap([player, player2], this.portalGroup, (playerSprite, portalSprite) => portalSprite.getData("owner").teleport(playerSprite), null, this);

  this.jumperGroup = this.physics.add.group();
  this.physics.add.collider(this.jumperGroup, topLayer);
  this.physics.add.collider([player, player2], this.jumperGroup);

  // ENEMY AND LEVEL OBJECT CREATION (from src/data/levelSpawns.js)

  this.portals = LEVEL_SPAWNS.portals.map(({ x, y, destX, destY, portalType }) =>
    new Portal(this, x, y, destX, destY, portalType, { audio: this.audio, group: this.portalGroup })
  );

  this.flamethrowers = LEVEL_SPAWNS.flamethrowers.map(({ x, y, delay }) =>
    new Flamethrower(this, x, y, delay, { gameState: this.state, group: this.flamethrowerGroup })
  );

  this.jumpers = LEVEL_SPAWNS.jumpers.map(({ x, y, height }) =>
    new Jumper(this, x, y, height, { group: this.jumperGroup })
  );

  this.slimes = LEVEL_SPAWNS.slimes.map(({ x, y, point }) =>
    new Slime(this, x, y, point, { gameState: this.state, audio: this.audio, group: this.slimeGroup })
  );

  this.skeletons = LEVEL_SPAWNS.skeletons.map(({ x, y, point }) =>
    new Skeleton(this, x, y, point, { gameState: this.state, audio: this.audio, group: this.skeletonGroup })
  );

  this.demons = LEVEL_SPAWNS.demons.map(({ x, y }) =>
    new Demon(this, x, y, { gameState: this.state, audio: this.audio, group: this.demonGroup })
  );

  topLayer6 = map.createStaticLayer("topLayerCastle2", [terrain6]);
  topLayer8 = map.createStaticLayer("LayerSecreto", [terrain8]);


  //pointer = this.input.addPointer(1);

  // ADDING COLLISION TO THE GAME

  // LAYERS
  topLayer.setCollisionByProperty({ collides: true });
  topLayer2.setCollisionByProperty({ collides: true });
  // BARRIERS
  this.physics.add.collider(barrier1, topLayer);
  this.physics.add.collider(barrier1, topLayer2);
  this.physics.add.collider(barrier2, topLayer);
  this.physics.add.collider(barrier2, topLayer2);
  this.physics.add.collider(player, barrier1, openBarrier1FromPlayer1, null, this);
  this.physics.add.collider(player, barrier2, openBarrier2FromPlayer1, null, this);
  this.physics.add.collider(player2, barrier1, openBarrier1FromPlayer2, null, this);
  this.physics.add.collider(player2, barrier2, openBarrier2FromPlayer2, null, this);
  // JAILDOOR
  this.physics.add.collider(JailDoor, topLayer);
  this.physics.add.collider(JailDoor, topLayer2);
  this.physics.add.collider(player, JailDoor, openJailDoorPlayer1, null, this);
  this.physics.add.collider(player2, JailDoor, openJailDoorPlayer2, null, this);


  // KEYS
  this.physics.add.collider(yellowKey, topLayer);
  this.physics.add.collider(yellowKey, topLayer2);
  this.physics.add.collider(blueKey, topLayer);
  this.physics.add.collider(blueKey, topLayer2);
  this.physics.add.overlap(player, yellowKey, collectYellowKeyPlayer1, null, this);
  this.physics.add.overlap(player2, yellowKey, collectYellowKeyPlayer2, null, this);
  this.physics.add.overlap(player, blueKey, collectBlueKeyPlayer1, null, this);
  this.physics.add.overlap(player2, blueKey, collectBlueKeyPlayer2, null, this);

  // SPIKES
  this.physics.add.overlap(player, spike, hitSpike, null, this);
  this.physics.add.overlap(player2, spike, hitSpike2, null, this);

  // HEALTH


  // CAMERA SYSTEM
  
this.cameras.main.setBounds(0, 0, 4096, 4096).setSize(800, 300); // camera bounds
this.physics.world.setBounds(0, 0, 4096, 4096); // world bounds

this.cameras.main.startFollow(player2, true, 0.5, 0.5);
this.cameras.add(0, 300, 800, 300).startFollow(player, true, 0.5, 0.5).setBounds(0, 150, 4096, 4096);
  
  // FULLSCREEN IMPLEMENTATION CODE

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

  // PLAYER ANIMATIONS
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

  // PLAYER 2 ANIMATIONS
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

  // BARRIER 1 ANIMATIONS
  this.anims.create({
    key: "barrier1Idle",
    frames: this.anims.generateFrameNumbers("barrier1Idle", { start: 0, end: 11 }),
    frameRate: 9,
    repeat: -1
  });
  
  this.anims.create({
    key: "barrier1Open",
    frames: this.anims.generateFrameNumbers("barrier1Open", { start: 0, end: 6 }),
    frameRate: 7,
    repeat: 0
  });

    // BARRIER 2 ANIMATIONS
  this.anims.create({
    key: "barrier2Idle",
    frames: this.anims.generateFrameNumbers("barrier2Idle", { start: 0, end: 11 }),
    frameRate: 9,
    repeat: -1
  });
  this.anims.create({
    key: "barrier2Open",
    frames: this.anims.generateFrameNumbers("barrier2Open", { start: 0, end: 6 }),
    frameRate: 7,
    repeat: 0
  });

  // KEY ANIMATIONS

  this.anims.create({
    key: "yellowKeySpin",
    frames: this.anims.generateFrameNumbers("yellowKey", { start: 0, end: 6}),
    frameRate: 7,
    repeat: -1
  });
  this.anims.create({
    key: "blueKeySpin",
    frames: this.anims.generateFrameNumbers("blueKey", { start: 0, end: 9}),
    frameRate: 9,
    repeat: -1
  });

  // JAILDOOR ANIMATION
  this.anims.create({
    key: "JailDoor_Opening",
    frames: this.anims.generateFrameNumbers("jaildoor", {start:0, end: 8}),
    frameRate: 7,
    repeat: 0
  });

// END OF CREATE
}

// UPDATE IS WHAT MAKES THE GAME RUN, IT RUNS CONTINUOUSLY, MANY TIMES PER SECOND
update(time, delta) {

this.jumpers.forEach((jumper) => jumper.update());
this.slimes.forEach((slime) => slime.update());
this.skeletons.forEach((skeleton) => skeleton.update());
this.demons.forEach((demon) => demon.update());
this.flamethrowers.forEach((flamethrower) => flamethrower.update());
this.portals.forEach((portal) => portal.update());


    // GAME OVER
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

    // HEALTH
    if (this.state.soulCount > 0 && this.state.soulCount <= 190){
      Soul.setFrame(this.state.soulCount)
    }
    else if(this.state.soulCount <= 0){
      this.state.isGameOver = true;
    }

    // JAILDOOR ANIMATION
    if (JailDoor.anims.getCurrentKey() === "JailDoor_Opening" && JailDoor.anims.getProgress("JailDoor_Opening") < 1){
      //JailDoor.disableBody();
    }
    else if(JailDoor.anims.getCurrentKey() === "JailDoor_Opening" && JailDoor.anims.getProgress("JailDoor_Opening") === 1){
      this.state.isEndgame = true;
      JailDoor.disableBody();
    }

    // YELLOW KEY ANIMATION
    if(yellowKey.anims.getCurrentKey() != "yellowKeySpin" && this.state.hasYellowKey === false){
      yellowKey.anims.play("yellowKeySpin", true);
    }
    // BLUE KEY ANIMATION
    if(blueKey.anims.getCurrentKey() != "blueKeySpin" && this.state.hasBlueKey === false){
      blueKey.anims.play("blueKeySpin", true);
    }

    // BARRIER 1 ANIMATION
    if(barrier1.anims.getCurrentKey() === "barrier1Open" && barrier1.anims.getProgress("barrier1Open") === 1){
      barrier1.disableBody(true, true);
    }
    else if(barrier1.anims.getCurrentKey() === "barrier1Open" && barrier1.anims.getProgress("barrier1Open") < 1){
    }
    else if(barrier1.anims.getCurrentKey() != "barrier1Idle" && barrier1.anims.getCurrentKey() != "barrier1Open" && this.state.isBarrier1Open === false){
      barrier1.anims.play("barrier1Idle", true);
    }

    // BARRIER 2 ANIMATION
    if(barrier2.anims.getCurrentKey() === "barrier2Open" && barrier2.anims.getProgress("barrier2Open") === 1){
      barrier2.disableBody(true, true);
    }
    else if(barrier2.anims.getCurrentKey() === "barrier2Open" && barrier2.anims.getProgress("barrier2Open") < 1){
    }
    else if(barrier2.anims.getCurrentKey() != "barrier2Idle" && barrier2.anims.getCurrentKey() != "barrier2Open" && this.state.isBarrier2Open === false){
      barrier2.anims.play("barrier2Idle", true);
    }


    //          PLAYER ANIMATIONS

    if (keyP.isDown) {
      console.log(player.body.position.x, player.body.position.y, this.state.bossesDefeated, JailDoor.anims.getCurrentKey(), this.state.isEndgame, this.state.isGameOver);
    }

    this.player1.update(time, delta);
    this.player2.update(time, delta);
    playerPosition = this.player1.position;
    player2Position = this.player2.position;

// END OF UPDATE
  }
}



// SPIKE DAMAGE FUNCTIONS

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

function openBarrier1FromPlayer1(player, barrier1){
  if(this.state.isBarrier1Open === false && this.state.hasYellowKey === true){
    barrier1.anims.play("barrier1Open");
    this.state.hasYellowKey = false;
  }
}

function openBarrier2FromPlayer1(player, barrier2){
  if(this.state.isBarrier2Open === false && this.state.hasBlueKey === true){
    barrier2.anims.play("barrier2Open");
    this.state.hasBlueKey = false;
  }
}
function openBarrier1FromPlayer2(player2, barrier1){
  if(this.state.isBarrier1Open === false && this.state.hasYellowKey === true){
    barrier1.anims.play("barrier1Open");
    this.state.hasYellowKey = false;
  }
}
function openBarrier2FromPlayer2(player2, barrier2){
  if(this.state.isBarrier2Open === false && this.state.hasBlueKey === true){
    barrier2.anims.play("barrier2Open");
    this.state.hasBlueKey = false;
  }
}

function collectYellowKeyPlayer1(player, yellowKey){
  this.state.hasYellowKey = true;
  this.audio.get("keyPickup").play();
  yellowKey.disableBody(true, true);
}
function collectYellowKeyPlayer2(player2, yellowKey){
  this.state.hasYellowKey = true;
  this.audio.get("keyPickup").play();
  yellowKey.disableBody(true, true);
}
function collectBlueKeyPlayer1(player, blueKey){
  this.state.hasBlueKey = true;
  this.audio.get("keyPickup").play();
  blueKey.disableBody(true, true);
}
function collectBlueKeyPlayer2(player2, blueKey){
  this.state.hasBlueKey = true;
  this.audio.get("keyPickup").play();
  blueKey.disableBody(true, true);
}

// JAILDOOR OPENING FUNCTIONS
function openJailDoorPlayer1(player, JailDoor){
	if(this.state.bossesDefeated === 2){
  if(JailDoor.anims.getCurrentKey() != "JailDoor_Opening"){
    JailDoor.anims.play("JailDoor_Opening", true);
  }
  if(!this.audio.get("jailDoorOpening").isPlaying){
    this.audio.get("jailDoorOpening").play();
  }
  }
}
function openJailDoorPlayer2(player2, JailDoor){
	if(this.state.bossesDefeated === 2){
  if(JailDoor.anims.getCurrentKey() != "JailDoor_Opening"){
    JailDoor.anims.play("JailDoor_Opening", true);
  }
  if(!this.audio.get("jailDoorOpening").isPlaying){
    this.audio.get("jailDoorOpening").play();
  }
  }
}
