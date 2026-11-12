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

// Goes to full screen (hiding the browser's bars) and, where the browser allows it, locks the
// screen to landscape. It must run inside a tap or key press: browsers refuse it otherwise.
export function enterFullscreen(scene) {
  if (!scene.scale.fullscreen.available || scene.scale.isFullscreen) return;
  scene.scale.startFullscreen();
  screen.orientation?.lock?.("landscape").catch(() => {});
}
