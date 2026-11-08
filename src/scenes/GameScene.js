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
import { Spikes } from "../entities/hazards/Spikes.js";
import { Key } from "../entities/interactive/Key.js";
import { Barrier } from "../entities/interactive/Barrier.js";
import { JailDoor } from "../entities/interactive/JailDoor.js";
import { LEVEL_SPAWNS } from "../data/levelSpawns.js";

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

  const map = this.add.tilemap("level1");

  const terrain = map.addTilesetImage("cave", "cave");
  const terrain2 = map.addTilesetImage("surface", "surface");
  const terrain3 = map.addTilesetImage("background", "background");
  const terrain4 = map.addTilesetImage("background2", "background2");
  const terrain5 = map.addTilesetImage("wood", "wood");
  const terrain6 = map.addTilesetImage("ground", "ground");
  const terrain7 = map.addTilesetImage("environment", "environment");
  const terrain8 = map.addTilesetImage("caveBackground", "caveBackground");
  const terrain9 = map.addTilesetImage("Easter Egg", "Easter Egg");

  // creating the map layers (creation order is the draw order)

  const topLayer3 = map.createStaticLayer("topLayer3", [terrain3], 0, 0);
  map.createStaticLayer("topLayer4", [terrain4], 0, 0);

  this.spikes = new Spikes(this, LEVEL_SPAWNS.spikes, { gameState: this.state });

  const topLayer = map.createStaticLayer("topLayer", [terrain], 0, 0);
  const topLayer2 = map.createStaticLayer("topLayer2", [terrain2], 0, 0);
  map.createStaticLayer("topLayerCastle1", [terrain5]);
  map.createStaticLayer("topLayerCastle3", [terrain7]);
  map.createStaticLayer("EasterEgg", [terrain9]);

  const groundLayers = [topLayer, topLayer2];

  // BARRIERS, KEYS AND JAIL DOOR
  this.barriers = LEVEL_SPAWNS.barriers.map((data) =>
    new Barrier(this, data, { gameState: this.state, groundLayers })
  );
  this.keys = LEVEL_SPAWNS.keys.map((data) =>
    new Key(this, data, { gameState: this.state, audio: this.audio, groundLayers })
  );
  this.jailDoor = new JailDoor(this, LEVEL_SPAWNS.jailDoor, {
    gameState: this.state,
    audio: this.audio,
    groundLayers
  });

  // KEYBOARD SETUP

  const cursors = this.input.keyboard.createCursorKeys();
  const { KeyCodes } = Phaser.Input.Keyboard;
  const keyW = this.input.keyboard.addKey(KeyCodes.W);
  const keyA = this.input.keyboard.addKey(KeyCodes.A);
  const keyS = this.input.keyboard.addKey(KeyCodes.S);
  const keyD = this.input.keyboard.addKey(KeyCodes.D);
  const keyENTER = this.input.keyboard.addKey(KeyCodes.ENTER);

  const controlSchemes = [
    { up: cursors.up, down: cursors.down, left: cursors.left, right: cursors.right, attack: keyENTER },
    { up: keyW, down: keyS, left: keyA, right: keyD, attack: cursors.space }
  ];

  // PLAYERS (one per entry in LEVEL_SPAWNS.players; each enemy and object works on this.players)
  this.players = LEVEL_SPAWNS.players.map(({ character, x, y }, index) =>
    new Player(this, {
      id: index + 1,
      character,
      x,
      y,
      controls: controlSchemes[index],
      groundLayers,
      audio: this.audio
    })
  );
  const playerSprites = this.players.map((player) => player.sprite);

  this.soulIcon = this.add
  .image(20, 20, "soul")
  .setOrigin(0.5)
  .setScrollFactor(0).setScale(1.5);

  // PHYSICS GROUPS PER ENEMY/OBJECT TYPE
  // One collider/overlap per group instead of one per instance; each entity
  // adds itself to the group and tags sprite.setData("owner", this) in its constructor.
  // Players are tagged the same way, so the callback hands entities the Player object.
  const resolveOwner = (playerSprite, entitySprite) =>
    entitySprite.getData("owner").handlePlayerHit(playerSprite.getData("owner"));

  this.slimeGroup = this.physics.add.group();
  this.physics.add.collider(this.slimeGroup, groundLayers);
  this.physics.add.overlap(playerSprites, this.slimeGroup, resolveOwner, null, this);

  this.skeletonGroup = this.physics.add.group();
  this.physics.add.collider(this.skeletonGroup, [topLayer, topLayer2, topLayer3]);
  this.physics.add.overlap(playerSprites, this.skeletonGroup, resolveOwner, null, this);

  this.demonGroup = this.physics.add.group();
  this.physics.add.collider(this.demonGroup, [topLayer, topLayer2, topLayer3]);
  this.physics.add.overlap(playerSprites, this.demonGroup, resolveOwner, null, this);

  this.flamethrowerGroup = this.physics.add.group();
  this.physics.add.collider(this.flamethrowerGroup, topLayer);
  this.physics.add.collider(playerSprites, this.flamethrowerGroup, resolveOwner, null, this);

  this.portalGroup = this.physics.add.group();
  this.physics.add.collider(this.portalGroup, groundLayers);
  this.physics.add.overlap(playerSprites, this.portalGroup, (playerSprite, portalSprite) => portalSprite.getData("owner").teleport(playerSprite), null, this);

  this.jumperGroup = this.physics.add.group();
  this.physics.add.collider(this.jumperGroup, topLayer);
  this.physics.add.collider(playerSprites, this.jumperGroup);

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

  map.createStaticLayer("topLayerCastle2", [terrain6]);
  map.createStaticLayer("LayerSecreto", [terrain8]);

  // ADDING COLLISION TO THE GAME

  topLayer.setCollisionByProperty({ collides: true });
  topLayer2.setCollisionByProperty({ collides: true });

  // Objects that react to the players touching them
  [this.spikes, ...this.barriers, ...this.keys, this.jailDoor].forEach((object) => object.bindPlayers(this.players));

  // CAMERA SYSTEM
  // The top camera follows the second player, the bottom camera follows the first (local split-screen).

  this.cameras.main.setBounds(0, 0, 4096, 4096).setSize(800, 300); // camera bounds
  this.physics.world.setBounds(0, 0, 4096, 4096); // world bounds

  this.cameras.main.startFollow(this.players[1].sprite, true, 0.5, 0.5);
  this.cameras.add(0, 300, 800, 300).startFollow(this.players[0].sprite, true, 0.5, 0.5).setBounds(0, 150, 4096, 4096);

  // FULLSCREEN IMPLEMENTATION CODE

  const FKey = this.input.keyboard.addKey("F");

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
    this.barriers.forEach((barrier) => barrier.update());
    this.jailDoor.update();

    // GAME OVER
    if (this.state.isGameOver === true) {
      this.audio.get("music").stop();
      this.players.forEach((player) => player.forceDeath());
    }
    if(this.state.isEndgame === true){
      this.audio.get("music").stop();
      this.physics.pause();
      this.scene.start(SCENE_KEYS.CREDITS);
    }

    // HEALTH
    if (this.state.soulCount > 0 && this.state.soulCount <= 190){
      this.soulIcon.setFrame(this.state.soulCount)
    }
    else if(this.state.soulCount <= 0){
      this.state.isGameOver = true;
    }

    this.players.forEach((player) => player.update(time, delta));

// END OF UPDATE
  }
}
