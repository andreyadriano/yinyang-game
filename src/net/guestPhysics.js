// The online guest does not run the game, but it moves its own player at once instead of waiting
// for the host (prediction). For that the physics world runs on the guest too, restricted to what
// the local player needs to walk around:
//   - every other body stays where the host put it (`moves = false`: no gravity, no velocity);
//   - the only colliders left are the local player against the solid things (the ground, jumpers,
//     barriers, the jail door), and they do nothing but keep the player from going through them.
//     Hits, keys, portals and spikes are decided by the host (see GuestSession.applyEffect).
export function limitPhysicsToLocalPlayer(scene, localSprite, solids) {
  const world = scene.physics.world;

  for (const body of world.bodies) {
    if (body.gameObject !== localSprite) body.moves = false;
  }

  for (const collider of world.colliders.getActive()) {
    const { object1, object2 } = collider;
    const isLocal = object1 === localSprite || (Array.isArray(object1) && object1.includes(localSprite));
    const keep = isLocal && !collider.overlapOnly && solids.includes(object2);
    collider.active = keep;
    if (keep) collider.collideCallback = null;
    if (keep && Array.isArray(object1)) collider.object1 = localSprite;
  }
}
