import { SCENE_KEYS } from "./sceneKeys.js";
import { GAME_SOUNDS } from "../data/assets.js";
import { LEVEL_SPAWNS } from "../data/levelSpawns.js";
import { GameState } from "../core/GameState.js";
import { AudioManager } from "../core/AudioManager.js";
import { LevelMap } from "../level/LevelMap.js";
import { createEntityGroups } from "../level/EntityGroups.js";
import { spawnLevel } from "../level/spawnLevel.js";
import { setupSplitScreenCameras } from "../level/splitScreenCameras.js";
import { Player } from "../entities/player/Player.js";
import { Spikes } from "../entities/hazards/Spikes.js";
import { Key } from "../entities/interactive/Key.js";
import { Barrier } from "../entities/interactive/Barrier.js";
import { JailDoor } from "../entities/interactive/JailDoor.js";
import { createKeyboardInputs } from "../input/KeyboardInput.js";
import { bindFullscreenKey } from "../input/fullscreen.js";
import { Hud } from "../ui/Hud.js";

// The level scene. It only wires things together; the work lives in src/level, src/entities and src/ui.
// Assets are loaded by PreloadScene, and everything is created in a fixed order because the
// creation order is the draw order (see LevelMap).
export class GameScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.GAME);
  }

  create() {
    this.state = new GameState();
    this.audio = new AudioManager(this);
    this.audio.addAll(GAME_SOUNDS);
    this.audio.get("music").play({ loop: true, volume: 0.1 });

    // Scenery, with the objects that sit between its layers
    const level = new LevelMap(this, "level1");
    level.createBackground();
    this.spikes = new Spikes(this, LEVEL_SPAWNS.spikes, { gameState: this.state });
    level.createGround();
    this.createLevelObjects(level.groundLayers);

    // Players, health display, enemies and hazards
    this.players = this.createPlayers(level.groundLayers);
    this.hud = new Hud(this);
    const groups = createEntityGroups(this, { players: this.players, groundLayers: level.groundLayers });
    const spawned = spawnLevel(this, groups, { gameState: this.state, audio: this.audio });
    this.portals = spawned.portals;
    this.flamethrowers = spawned.flamethrowers;
    this.jumpers = spawned.jumpers;
    this.slimes = spawned.slimes;
    this.skeletons = spawned.skeletons;
    this.demons = spawned.demons;

    level.createForeground();
    level.enableCollisions();

    // Objects that react to the players touching them
    [this.spikes, ...this.barriers, ...this.keys, this.jailDoor].forEach((object) => object.bindPlayers(this.players));

    setupSplitScreenCameras(this, this.players);
    bindFullscreenKey(this);
  }

  createLevelObjects(groundLayers) {
    const deps = { gameState: this.state, audio: this.audio, groundLayers };
    this.barriers = LEVEL_SPAWNS.barriers.map((data) => new Barrier(this, data, deps));
    this.keys = LEVEL_SPAWNS.keys.map((data) => new Key(this, data, deps));
    this.jailDoor = new JailDoor(this, LEVEL_SPAWNS.jailDoor, deps);
  }

  // One player per entry in LEVEL_SPAWNS.players, each with its own keyboard scheme.
  createPlayers(groundLayers) {
    const inputs = createKeyboardInputs(this);
    return LEVEL_SPAWNS.players.map(
      ({ character, x, y }, index) =>
        new Player(this, { id: index + 1, character, x, y, input: inputs[index], groundLayers, audio: this.audio })
    );
  }

  update(time, delta) {
    const updatables = [
      this.jumpers,
      this.slimes,
      this.skeletons,
      this.demons,
      this.flamethrowers,
      this.portals,
      this.barriers
    ];
    updatables.forEach((entities) => entities.forEach((entity) => entity.update()));
    this.jailDoor.update();

    if (this.state.isGameOver) {
      this.audio.get("music").stop();
      this.players.forEach((player) => player.forceDeath());
    }
    if (this.state.isEndgame) {
      this.audio.get("music").stop();
      this.physics.pause();
      this.scene.start(SCENE_KEYS.CREDITS);
    }

    this.hud.update(this.state.soulCount);
    if (this.state.soulCount <= 0) {
      this.state.isGameOver = true;
    }

    this.players.forEach((player) => player.update(time, delta));
  }
}
