// The part of a sprite's state that is the same for every entity: where it is and how it moves,
// and what it looks like (animation, tint). Plain numbers, strings and booleans, so it is JSON.
export function getSpriteState(sprite) {
  const anims = sprite.anims;
  const body = sprite.body;
  return {
    x: sprite.x,
    y: sprite.y,
    vx: body.velocity.x,
    vy: body.velocity.y,
    flipX: sprite.flipX,
    active: sprite.active,
    visible: sprite.visible,
    bodyEnabled: body.enable,
    anim: anims.getName() || null,
    progress: anims.getProgress(),
    tinted: sprite.isTinted
  };
}

// Options: `position: false` leaves the sprite where it is (the guest moves it smoothly toward the
// target), and `progress: false` only syncs the animation frame when the animation changes (so a
// looping animation keeps playing on its own between snapshots).
export function applySpriteState(sprite, state, { position = true, progress = true } = {}) {
  sprite.setActive(state.active).setVisible(state.visible);

  sprite.body.enable = state.bodyEnabled;
  if (position) {
    if (state.bodyEnabled) {
      sprite.body.reset(state.x, state.y);
      sprite.setVelocity(state.vx, state.vy);
    } else {
      sprite.setPosition(state.x, state.y);
    }
  }

  sprite.setFlipX(state.flipX);

  if (state.anim) {
    const changed = sprite.anims.getName() !== state.anim;
    if (changed) {
      sprite.anims.play(state.anim);
    }
    if (changed || progress) {
      sprite.anims.setProgress(state.progress);
    }
  } else {
    sprite.anims.stop();
  }

  if (state.tinted) {
    sprite.setTint(0xff0000);
  } else {
    sprite.clearTint();
  }
}
