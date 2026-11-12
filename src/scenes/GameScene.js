import { SCENE_KEYS } from "./sceneKeys.js";
import { GAME_SOUNDS } from "../data/assets.js";
import { LEVEL_SPAWNS } from "../data/levelSpawns.js";
import { GameState } from "../core/GameState.js";
import { AudioManager } from "../core/AudioManager.js";
import { resolveGameMode } from "../core/gameMode.js";
import { EntityRegistry } from "../sim/EntityRegistry.js";
import { FixedStepper } from "../sim/FixedStepper.js";
import { LevelMap } from "../level/LevelMap.js";
import { createEntityGroups } from "../level/EntityGroups.js";
import { spawnLevel } from "../level/spawnLevel.js";
import { setupSingleCamera, setupSplitScreenCameras } from "../level/cameras.js";
import { Player } from "../entities/player/Player.js";
import { Spikes } from "../entities/hazards/Spikes.js";
import { Key } from "../entities/interactive/Key.js";
import { Barrier } from "../entities/interactive/Barrier.js";
import { JailDoor } from "../entities/interactive/JailDoor.js";
import { createKeyboardInputs } from "../input/KeyboardInput.js";
import { TouchInput } from "../input/TouchInput.js";
import { NetworkInput } from "../input/NetworkInput.js";
import { connectOnline } from "../net/connectOnline.js";
import { HostSession } from "../net/HostSession.js";
import { GuestSession } from "../net/GuestSession.js";
import { limitPhysicsToLocalPlayer } from "../net/guestPhysics.js";
import { OnlineStatus } from "../ui/OnlineStatus.js";
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
    this.mode = resolveGameMode();
    this.isGuest = this.mode.online?.role === "guest"; // the guest does not run the game: it draws what the host sends
    this.leftScene = false;
    this.state = new GameState();
    this.entities = new EntityRegistry(); // stable ids, saved and restored by src/sim/snapshot.js
    this.stepper = new FixedStepper(); // the game logic runs in fixed steps of 1/60 s
    this.isLeaving = false;
    this.audio = new AudioManager(this);
    this.audio.addAll(GAME_SOUNDS);
    this.audio.playWhenUnlocked("music", { loop: true, volume: 0.1 });

    // Scenery, with the objects that sit between its layers
    const level = new LevelMap(this, "level1");
    level.createBackground();
    this.spikes = new Spikes(this, LEVEL_SPAWNS.spikes, { gameState: this.state });
    level.createGround();
    this.createLevelObjects(level.groundLayers);

    // Players, health display, enemies and hazards
    this.players = this.createPlayers(level.groundLayers);
    // The player of this device (the camera follows it) and, online, the one on the other device.
    this.localPlayer = this.players.find(
      (player) => player.character === (this.mode.localCharacter ?? this.players[0].character)
    );
    this.remotePlayer = this.mode.online ? this.players.find((player) => player !== this.localPlayer) : null;
    this.hud = new Hud(this);
    const groups = createEntityGroups(this, { players: this.players, groundLayers: level.groundLayers });
    const spawned = spawnLevel(this, groups, { gameState: this.state, audio: this.audio, registry: this.entities });
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

    if (this.isGuest) {
      // The guest only simulates its own player; the rest is drawn from what the host sends.
      const solids = [
        ...level.groundLayers,
        groups.jumper,
        ...this.barriers.map((barrier) => barrier.sprite),
        this.jailDoor.sprite
      ];
      limitPhysicsToLocalPlayer(this, this.localPlayer.sprite, solids);
    }

    if (this.mode.camera === "split") {
      setupSplitScreenCameras(this, this.players);
    } else {
      setupSingleCamera(this, this.localPlayer);
    }
    bindFullscreenKey(this);

    if (this.touchInput) {
      this.scene.launch(SCENE_KEYS.TOUCH_CONTROLS, {
        gameScene: this,
        touchInput: this.touchInput,
        allowPause: !this.mode.online
      });
      this.events.once("shutdown", () => this.scene.stop(SCENE_KEYS.TOUCH_CONTROLS));
    }

    if (this.mode.online) this.startOnline();
  }

  // Online co-op: connect to the relay, then run a host or a guest session (see src/net).
  startOnline() {
    const { role, room, relayUrl, turnstileSiteKey } = this.mode.online;
    this.onlineStatus = new OnlineStatus(this, { role, room });

    if (role === "host") {
      this.remotePlayer.announceSounds = false; // the guest plays its own player's sounds itself
      this.setRemotePlayerPresent(false); // until the friend connects
    }

    this.events.once("shutdown", () => {
      this.leftScene = true;
      this.session?.stop();
    });

    connectOnline({ role, room, relayUrl, turnstileSiteKey })
      .then((transport) => {
        if (this.leftScene) {
          transport.close();
          return;
        }
        this.session = role === "host" ? new HostSession(this, transport) : new GuestSession(this, transport);
        this.onlineStatus.setConnected();
      })
      .catch((error) => this.onlineStatus.showError(error.message));
  }

  // Online, shows or hides the player on the other device (hidden until they connect, and when they leave).
  setRemotePlayerPresent(present) {
    if (!this.remotePlayer) return;
    if (present) {
      this.remotePlayer.appearAt(this.localPlayer.sprite.x, this.localPlayer.sprite.y);
    } else {
      this.remotePlayer.disappear();
    }
  }

  createLevelObjects(groundLayers) {
    const deps = { gameState: this.state, audio: this.audio, groundLayers };
    this.barriers = LEVEL_SPAWNS.barriers.map((data) => this.entities.add("barrier", new Barrier(this, data, deps)));
    this.keys = LEVEL_SPAWNS.keys.map((data) => this.entities.add("key", new Key(this, data, deps)));
    this.jailDoor = this.entities.add("jailDoor", new JailDoor(this, LEVEL_SPAWNS.jailDoor, deps));
  }

  // The players that play on this device (see the game mode), each with its own input source:
  // the touch buttons on phones, otherwise one keyboard scheme per player.
  createPlayers(groundLayers) {
    this.touchInput = this.mode.touch ? new TouchInput() : null;
    const localInputs = this.touchInput ? [this.touchInput] : createKeyboardInputs(this);
    const spawns = LEVEL_SPAWNS.players.filter(({ character }) => this.mode.characters.includes(character));

    return spawns.map(({ character, x, y }, index) => {
      // local and solo: inputs in order. Online: the local character uses this device's input and
      // the other one is played from the network (see HostSession).
      let input = localInputs[index];
      if (this.mode.localCharacter) {
        if (character === this.mode.localCharacter) {
          input = localInputs[0];
          this.localInput = input;
        } else {
          input = this.remoteInput = new NetworkInput();
        }
      }
      const player = new Player(this, {
        character,
        x,
        y,
        input,
        groundLayers,
        audio: this.audio,
        events: this.state.events
      });
      return this.entities.add("player", player);
    });
  }

  // Runs every frame: the game logic advances in fixed steps, then the screen is updated.
  update(time, delta) {
    if (this.isGuest) {
      // Only the local player is simulated here (once the host has sent the first picture of the game).
      if (this.session?.synced) this.stepper.advance(delta, (stepMs) => this.simulateGuest(time, stepMs));
      this.session?.update(delta);
    } else {
      this.stepper.advance(delta, (stepMs) => this.simulate(time, stepMs));
    }
    this.hud.update(this.state.soulCount);
  }

  // One step of the guest: its own player moves with its own controls, at once.
  simulateGuest(time, stepMs) {
    const { sprite } = this.localPlayer;
    if (!sprite.active) return;
    if (this.localPlayer.isDead()) sprite.setVelocity(0, 0);
    else this.localPlayer.update(time, stepMs);
  }

  // One step of the game logic (1/60 s).
  simulate(time, stepMs) {
    if (this.isLeaving) return;

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
      this.players.forEach((player) => player.sprite.active && player.forceDeath());
    }
    if (this.state.isEndgame) {
      this.isLeaving = true;
      this.audio.get("music").stop();
      this.physics.pause();
      this.scene.start(SCENE_KEYS.CREDITS);
      return;
    }

    if (this.state.soulCount <= 0) {
      this.state.gameOver();
    }

    this.players.forEach((player) => player.sprite.active && player.update(time, stepMs));
    this.session?.afterStep(this.stepper.tick);
  }
}
