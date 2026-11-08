// One physics group per kind of enemy or object. Each entity adds itself to its group and tags
// sprite.setData("owner", this), so there is one collider/overlap per group instead of one per
// instance. Players are tagged the same way, so callbacks hand entities the Player object.
export function createEntityGroups(scene, { players, groundLayers }) {
  const playerSprites = players.map((player) => player.sprite);

  const handleHit = (playerSprite, entitySprite) =>
    entitySprite.getData("owner").handlePlayerHit(playerSprite.getData("owner"));
  const teleport = (playerSprite, portalSprite) => portalSprite.getData("owner").teleport(playerSprite);

  const groups = {
    slime: scene.physics.add.group(),
    skeleton: scene.physics.add.group(),
    demon: scene.physics.add.group(),
    flamethrower: scene.physics.add.group(),
    portal: scene.physics.add.group(),
    jumper: scene.physics.add.group()
  };

  // Enemies walk on the ground and hurt the players they touch.
  for (const group of [groups.slime, groups.skeleton, groups.demon]) {
    scene.physics.add.collider(group, groundLayers);
    scene.physics.add.overlap(playerSprites, group, handleHit, null, scene);
  }

  // Flamethrowers are fixed to the first ground layer and hurt on contact.
  scene.physics.add.collider(groups.flamethrower, groundLayers[0]);
  scene.physics.add.collider(playerSprites, groups.flamethrower, handleHit, null, scene);

  // Portals teleport the players that overlap them.
  scene.physics.add.collider(groups.portal, groundLayers);
  scene.physics.add.overlap(playerSprites, groups.portal, teleport, null, scene);

  // Jumpers are solid; their bounce is driven by Jumper.update().
  scene.physics.add.collider(groups.jumper, groundLayers[0]);
  scene.physics.add.collider(playerSprites, groups.jumper);

  return groups;
}
