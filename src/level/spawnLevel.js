import { LEVEL_SPAWNS } from "../data/levelSpawns.js";
import { Slime } from "../entities/enemies/Slime.js";
import { Skeleton } from "../entities/enemies/Skeleton.js";
import { Demon } from "../entities/enemies/Demon.js";
import Flamethrower from "../entities/hazards/Flamethrower.js";
import { Jumper } from "../entities/interactive/Jumper.js";
import { Portal } from "../entities/interactive/Portal.js";

// Creates the enemies, hazards and interactive objects listed in LEVEL_SPAWNS, each in its physics group.
// Returns them in arrays so the scene can call update() on all of them, and registers the ones with
// state in `registry` (kind + order in LEVEL_SPAWNS give each one its stable id).
export function spawnLevel(scene, groups, { gameState, audio, registry }) {
  const register = (kind, entities) => entities.map((entity) => registry.add(kind, entity));

  return {
    portals: LEVEL_SPAWNS.portals.map(
      ({ x, y, destX, destY, portalType }) =>
        new Portal(scene, x, y, destX, destY, portalType, { audio, group: groups.portal })
    ),
    flamethrowers: register(
      "flamethrower",
      LEVEL_SPAWNS.flamethrowers.map(
        ({ x, y, delay }) => new Flamethrower(scene, x, y, delay, { gameState, group: groups.flamethrower })
      )
    ),
    jumpers: register(
      "jumper",
      LEVEL_SPAWNS.jumpers.map(({ x, y, height }) => new Jumper(scene, x, y, height, { group: groups.jumper }))
    ),
    slimes: register(
      "slime",
      LEVEL_SPAWNS.slimes.map(
        ({ x, y, point }) => new Slime(scene, x, y, point, { gameState, audio, group: groups.slime })
      )
    ),
    skeletons: register(
      "skeleton",
      LEVEL_SPAWNS.skeletons.map(
        ({ x, y, point }) => new Skeleton(scene, x, y, point, { gameState, audio, group: groups.skeleton })
      )
    ),
    demons: register(
      "demon",
      LEVEL_SPAWNS.demons.map(({ x, y }) => new Demon(scene, x, y, { gameState, audio, group: groups.demon }))
    )
  };
}
