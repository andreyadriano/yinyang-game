// Queues every asset of a manifest (see src/data/assets.js) on a Phaser loader.
export function loadAssets(load, assets) {
  assets.images.forEach(({ key, path }) => load.image(key, path));
  assets.spritesheets.forEach(({ key, path, frameWidth, frameHeight }) =>
    load.spritesheet(key, path, { frameWidth, frameHeight })
  );
  assets.tilemaps.forEach(({ key, path }) => load.tilemapTiledJSON(key, path));
  assets.audio.forEach(({ key, path }) => load.audio(key, path));
}
