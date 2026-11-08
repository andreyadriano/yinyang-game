// Toggles fullscreen when the given key is pressed.
export function bindFullscreenKey(scene, keyName = "F") {
  scene.input.keyboard.addKey(keyName).on("down", () => {
    if (scene.scale.isFullscreen) {
      scene.scale.stopFullscreen();
    } else {
      scene.scale.startFullscreen();
    }
  });
}
