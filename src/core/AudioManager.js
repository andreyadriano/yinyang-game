export class AudioManager {
  constructor(scene) {
    this.scene = scene;
    this.sounds = {};
  }

  add(key, assetKey) {
    this.sounds[key] = this.scene.sound.add(assetKey);
    return this.sounds[key];
  }

  // Adds many sounds at once from { name: assetKey }.
  addAll(soundMap) {
    Object.entries(soundMap).forEach(([key, assetKey]) => this.add(key, assetKey));
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
