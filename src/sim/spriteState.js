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

export function applySpriteState(sprite, state) {
  sprite.setActive(state.active).setVisible(state.visible);

  sprite.body.enable = state.bodyEnabled;
  if (state.bodyEnabled) {
    sprite.body.reset(state.x, state.y);
    sprite.setVelocity(state.vx, state.vy);
  } else {
    sprite.setPosition(state.x, state.y);
  }

  sprite.setFlipX(state.flipX);

  if (state.anim) {
    if (sprite.anims.getName() !== state.anim) {
      sprite.anims.play(state.anim);
    }
    sprite.anims.setProgress(state.progress);
  } else {
    sprite.anims.stop();
  }

  if (state.tinted) {
    sprite.setTint(0xff0000);
  } else {
    sprite.clearTint();
  }
}
