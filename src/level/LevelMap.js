// Tiled map of a level. Layers are created in three phases because the creation order is the
// draw order: entities created between the phases end up in front of one phase and behind the next.
const TILESETS = [
  "cave",
  "surface",
  "background",
  "background2",
  "wood",
  "ground",
  "environment",
  "caveBackground",
  "Easter Egg"
];

// [layer name in the Tiled map, tileset it uses]
const BACKGROUND_LAYERS = [
  ["topLayer3", "background"],
  ["topLayer4", "background2"]
];
const GROUND_LAYERS = [
  ["topLayer", "cave"],
  ["topLayer2", "surface"]
];
const DECORATION_LAYERS = [
  ["topLayerCastle1", "wood"],
  ["topLayerCastle3", "environment"],
  ["EasterEgg", "Easter Egg"]
];
const FOREGROUND_LAYERS = [
  ["topLayerCastle2", "ground"],
  ["LayerSecreto", "caveBackground"]
];

export class LevelMap {
  constructor(scene, mapKey) {
    this.map = scene.add.tilemap(mapKey);
    this.tilesets = Object.fromEntries(TILESETS.map((name) => [name, this.map.addTilesetImage(name, name)]));
    this.groundLayers = [];
  }

  // Layers behind everything (sky, cave walls).
  createBackground() {
    this.createLayers(BACKGROUND_LAYERS);
  }

  // The layers the players and enemies walk on, plus the decorations drawn with them.
  createGround() {
    this.groundLayers = this.createLayers(GROUND_LAYERS);
    this.createLayers(DECORATION_LAYERS);
  }

  // Layers drawn in front of the players and enemies.
  createForeground() {
    this.createLayers(FOREGROUND_LAYERS);
  }

  // Marks the ground tiles that have `collides: true` in the Tiled map as solid.
  enableCollisions() {
    this.groundLayers.forEach((layer) => layer.setCollisionByProperty({ collides: true }));
  }

  createLayers(definitions) {
    return definitions.map(([layerName, tilesetName]) =>
      this.map.createLayer(layerName, [this.tilesets[tilesetName]], 0, 0)
    );
  }
}
