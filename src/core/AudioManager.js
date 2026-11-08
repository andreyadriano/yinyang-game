import { EventBus } from "./EventBus.js";

// The game's sounds by name (see GAME_SOUNDS in src/data/assets.js).
//
// Sound effects are played with play(), which also announces them on `events` ("play" with the name
// and volume). Online, the host forwards those announcements so the guest, who does not run the
// game logic, hears the same effects (playQuiet() plays one without announcing it).
export class AudioManager {
  constructor(scene) {
    this.scene = scene;
    this.sounds = {};
    this.events = new EventBus();
  }

  add(key, assetKey) {
    this.sounds[key] = this.scene.sound.add(assetKey);
    return this.sounds[key];
  }

  // Adds many sounds at once from { name: assetKey }.
  addAll(soundMap) {
    Object.entries(soundMap).forEach(([key, assetKey]) => this.add(key, assetKey));
  }

  // Plays a sound effect and announces it.
  play(name, config) {
    this.sounds[name].play(config);
    this.events.emit("play", { name, volume: config?.volume });
  }

  // Plays a sound effect without announcing it (used for what the host tells the guest to play).
  playQuiet(name, config) {
    this.sounds[name]?.play(config);
  }

  isPlaying(name) {
    return this.sounds[name].isPlaying;
  }

  // Phones keep audio locked until the first touch: play as soon as it is unlocked.
  playWhenUnlocked(key, config) {
    const sound = this.get(key);
    if (this.scene.sound.locked) {
      this.scene.sound.once("unlocked", () => sound.play(config));
    } else {
      sound.play(config);
    }
  }

  get(key) {
    return this.sounds[key];
  }
}
