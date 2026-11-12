export const WORLD_SIZE = 4096;

// Local two-player view: the top camera follows the second player, the bottom camera the first.
export function setupSplitScreenCameras(scene, players) {
  const { width, height } = scene.scale;
  const half = height / 2;
  scene.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE).setSize(width, half);
  scene.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);

  scene.cameras.main.startFollow(players[1].sprite, true, 0.5, 0.5);
  scene.cameras
    .add(0, half, width, half)
    .startFollow(players[0].sprite, true, 0.5, 0.5)
    .setBounds(0, 150, WORLD_SIZE, WORLD_SIZE);
}

// One player per device: a single full-screen camera that follows the local player.
export function setupSingleCamera(scene, player) {
  scene.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
  scene.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
  scene.cameras.main.startFollow(player.sprite, true, 0.5, 0.5);
}
