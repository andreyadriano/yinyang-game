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

  get(key) {
    return this.sounds[key];
  }
}
