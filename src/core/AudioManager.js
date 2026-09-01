export class AudioManager {
  constructor(scene) {
    this.scene = scene;
    this.sounds = {};
  }

  add(key, assetKey) {
    this.sounds[key] = this.scene.sound.add(assetKey);
    return this.sounds[key];
  }

  get(key) {
    return this.sounds[key];
  }
}
