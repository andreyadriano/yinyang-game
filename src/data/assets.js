// Every asset the game loads, by kind. PreloadScene loads all of them once at startup.
// Keys are what the code uses (this.add.image(x, y, key), scene.sound.add(key), ...).
// Paths are checked by tests/assets.spec.js, so a renamed or missing file fails the tests.
export const ASSETS = {
  images: [
    // Tilesets of level 1 (the names match the tilesets in the Tiled map)
    { key: "cave", path: "assets/environment/tilesets/cave.png" },
    { key: "caveBackground", path: "assets/environment/tilesets/caveBackground.png" },
    { key: "surface", path: "assets/environment/tilesets/surface.png" },
    { key: "background", path: "assets/environment/tilesets/background.png" },
    { key: "background2", path: "assets/environment/tilesets/background2.png" },
    { key: "environment", path: "assets/environment/tilesets/environment.png" },
    { key: "ground", path: "assets/environment/tilesets/ground.png" },
    { key: "wood", path: "assets/environment/tilesets/wood.png" },
    { key: "Easter Egg", path: "assets/environment/tilesets/Easter Egg.png" },

    { key: "spike", path: "assets/environment/spikes_1.png" },
    { key: "slime0", path: "assets/slime/slime0.png" },

    // Screens
    { key: "Start", path: "assets/interface/start.png" },
    { key: "gameover", path: "assets/interface/gameover.png" },
    { key: "creditsimage", path: "assets/interface/finalScreen.png" }
  ],

  spritesheets: [
    // Players (the run animation has its own sheet)
    { key: "yin", path: "assets/player/YinSpriteSheet.png", frameWidth: 50, frameHeight: 37 },
    { key: "yinrun", path: "assets/player/YinRun.png", frameWidth: 50, frameHeight: 37 },
    { key: "yang", path: "assets/player/YangSpriteSheet.png", frameWidth: 50, frameHeight: 37 },
    { key: "yangrun", path: "assets/player/YangRun.png", frameWidth: 50, frameHeight: 37 },

    // Enemies
    { key: "slimesheet", path: "assets/slime/slime-Sheet.png", frameWidth: 32, frameHeight: 25 },
    { key: "skeleton-attack", path: "assets/skeleton/skeleton-attack.png", frameWidth: 43, frameHeight: 37 },
    { key: "skeleton-die", path: "assets/skeleton/skeleton-die.png", frameWidth: 33, frameHeight: 32 },
    { key: "skeleton-hurt", path: "assets/skeleton/skeleton-hurt.png", frameWidth: 30, frameHeight: 32 },
    { key: "skeleton-idle", path: "assets/skeleton/skeleton-idle.png", frameWidth: 24, frameHeight: 32 },
    { key: "skeleton-walk", path: "assets/skeleton/skeleton-walk.png", frameWidth: 22, frameHeight: 33 },
    { key: "demon-attack1", path: "assets/demon/demon-attack_1.png", frameWidth: 240, frameHeight: 192 },
    { key: "demon-attack2", path: "assets/demon/demon-attack_2.png", frameWidth: 240, frameHeight: 192 },
    { key: "demon-idle1", path: "assets/demon/demon-idle_1.png", frameWidth: 160, frameHeight: 144 },
    { key: "demon-idle2", path: "assets/demon/demon-idle_2.png", frameWidth: 160, frameHeight: 144 },

    // Level objects
    { key: "flamethrower", path: "assets/environment/flamethrower.png", frameWidth: 17, frameHeight: 80 },
    { key: "jumper", path: "assets/environment/jumper.png", frameWidth: 48, frameHeight: 32 },
    { key: "portal1", path: "assets/environment/Portal 1.png", frameWidth: 33, frameHeight: 33 },
    { key: "portal2", path: "assets/environment/Portal 2.png", frameWidth: 33, frameHeight: 33 },
    { key: "neutralPortal", path: "assets/environment/NeutralPortal.png", frameWidth: 33, frameHeight: 33 },
    { key: "barrier1Open", path: "assets/environment/OpeningBarrier1.png", frameWidth: 32, frameHeight: 32 },
    { key: "barrier1Idle", path: "assets/environment/IdleBarrier1.png", frameWidth: 32, frameHeight: 32 },
    { key: "barrier2Open", path: "assets/environment/OpeningBarrier2.png", frameWidth: 32, frameHeight: 32 },
    { key: "barrier2Idle", path: "assets/environment/IdleBarrier2.png", frameWidth: 32, frameHeight: 32 },
    { key: "yellowKey", path: "assets/environment/yellowKey.png", frameWidth: 32, frameHeight: 32 },
    { key: "blueKey", path: "assets/environment/blueKey.png", frameWidth: 32, frameHeight: 32 },
    { key: "jaildoor", path: "assets/environment/jaildoor.png", frameWidth: 200, frameHeight: 200 },

    // Interface
    { key: "soul", path: "assets/interface/health(190hits).png", frameWidth: 31, frameHeight: 31 },
    { key: "fullscreen", path: "assets/fullscreen.png", frameWidth: 64, frameHeight: 64 } // not used yet (planned mobile button)
  ],

  tilemaps: [{ key: "level1", path: "assets/environment/level1.json" }],

  audio: [
    // Music
    { key: "starttheme", path: "assets/sounds/bgm/MenuMusic.mp3" },
    { key: "song", path: "assets/sounds/bgm/ebunny_-_Art_of_War.mp3" },
    { key: "fim", path: "assets/sounds/bgm/ebunny_-_Life.mp3" },

    // Effects
    { key: "youlose", path: "assets/sounds/sfx/you_lose.ogg" },
    { key: "swordwoosh", path: "assets/sounds/sfx/battle/swordwoosh.mp3" },
    { key: "slimeatk", path: "assets/sounds/sfx/battle/slime-attack.mp3" },
    { key: "jumping", path: "assets/sounds/sfx/movement/jump1.mp3" },
    { key: "landing", path: "assets/sounds/sfx/movement/landing1.mp3" },
    { key: "portalsound", path: "assets/sounds/sfx/SFX_Portal.mp3" },
    { key: "JaildoorOpeningSound", path: "assets/sounds/sfx/jailDoorOpening.mp3" },
    { key: "JumperSound", path: "assets/sounds/sfx/jumperBounce.mp3" }, // not used yet
    { key: "BossAtk", path: "assets/sounds/sfx/BossAtk.mp3" },
    { key: "BossDying", path: "assets/sounds/sfx/BossDying.mp3" },
    { key: "SkeletonAtk", path: "assets/sounds/sfx/SkeletonAtk.mp3" },
    { key: "SkeletonDie", path: "assets/sounds/sfx/SkeletonDying.mp3" },
    { key: "SkeletonHurt", path: "assets/sounds/sfx/SkeletonHurt.mp3" },
    { key: "SlimeDying", path: "assets/sounds/sfx/SlimeDying.mp3" },
    { key: "keyPickupSound", path: "assets/sounds/sfx/keyPickup.mp3" }
  ]
};

// Sounds the game scene looks up by name with audio.get(name) -> asset key above.
export const GAME_SOUNDS = {
  music: "song",
  swordWoosh: "swordwoosh",
  jump: "jumping",
  landing: "landing",
  portal: "portalsound",
  jailDoorOpening: "JaildoorOpeningSound",
  bossAttack: "BossAtk",
  bossDie: "BossDying",
  skeletonAttack: "SkeletonAtk",
  skeletonDie: "SkeletonDie",
  skeletonHurt: "SkeletonHurt",
  slimeDie: "SlimeDying",
  slimeAttack: "slimeatk",
  keyPickup: "keyPickupSound"
};
