// Level spawn points (Level 1). Coordinates in map pixels.
export const LEVEL_SPAWNS = {
  // Players start next to each other; `character` is the texture key and animation prefix.
  players: [
    { character: "yin", x: 100, y: 350 },
    { character: "yang", x: 75, y: 350 }
  ],

  // Spikes: optional scale / body size / body offset. The spike body is resized only when width is given.
  spikes: [
    { x: 590, y: 490 },
    { x: 992, y: 410, scale: 1.3, width: 150, height: 20 },
    { x: 2188, y: 1670, scale: 1.3, width: 115, height: 20, offsetX: -6, offsetY: -1 },
    { x: 2314, y: 1670, scale: 1.3, width: 115, height: 20, offsetX: -6, offsetY: -1 },
    { x: 2440, y: 1670, scale: 1.3, width: 115, height: 20, offsetX: -6, offsetY: -1 },
    { x: 2566, y: 1670, scale: 1.3, width: 115, height: 20, offsetX: -6, offsetY: -1 },
    { x: 3710, y: 890, scale: 1.3, width: 115, height: 20, offsetX: -6, offsetY: -1 },
    { x: 3836, y: 890, scale: 1.3, width: 115, height: 20, offsetX: -6, offsetY: -1 },
    { x: 3962, y: 890, scale: 1.3, width: 115, height: 18, offsetX: -6, offsetY: 2 },
    { x: 1820, y: 2263, scale: 1.3, width: 115, height: 20, offsetX: -6, offsetY: -1 },
    { x: 1946, y: 2263, scale: 1.3, width: 115, height: 20, offsetX: -6, offsetY: -1 },
    { x: 2072, y: 2263, scale: 1.3, width: 115, height: 20, offsetX: -6, offsetY: -1 },
    { x: 2198, y: 2263, scale: 1.3, width: 115, height: 20, offsetX: -6, offsetY: -1 },
    { x: 2326, y: 2263, scale: 1.3, width: 115, height: 20, offsetX: -6, offsetY: -1 },
    { x: 2452, y: 2263, scale: 1.3, width: 115, height: 20, offsetX: -6, offsetY: -1 },
    { x: 3456, y: 1880 }
  ],

  // Barriers open with the key of the matching color (see BARRIER_TYPES in Barrier.js).
  barriers: [
    { x: 2735, y: 1895, type: 1 },
    { x: 2735, y: 2100, type: 2 }
  ],

  // Keys: "yellow" opens barrier 1, "blue" opens barrier 2 (see KEY_TYPES in Key.js).
  keys: [
    { x: 3700, y: 1520, type: "yellow" },
    { x: 3830, y: 1500, type: "blue" }
  ],

  // Opens once both bosses are defeated and ends the game.
  jailDoor: { x: 2703, y: 1011 },

  portals: [
    { x: 2825, y: 1927, destX: 96, destY: 3616, portalType: 1 },
    { x: 2825, y: 2100, destX: 4000, destY: 3616, portalType: 2 },
    { x: 3770, y: 1666, destX: 1307, destY: 1443, portalType: 3 },
    { x: 2330, y: 1924, destX: 1307, destY: 1443, portalType: 3 },
    { x: 1257, y: 2167, destX: 1744, destY: 2573, portalType: 3 },
    { x: 2051, y: 2599, destX: 1307, destY: 1443, portalType: 3 },
    { x: 860, y: 2480, destX: 1307, destY: 1443, portalType: 3 },
    { x: 2938, y: 2910, destX: 1307, destY: 1443, portalType: 3 }
  ],

  flamethrowers: [
    { x: 1624, y: 1120, delay: 0 },
    { x: 1608, y: 1120, delay: 0 },
    { x: 1480, y: 1476, delay: 0 },
    { x: 1656, y: 1476, delay: 5100 },
    { x: 1832, y: 1476, delay: 0 },
    { x: 184, y: 1940, delay: 0 },
    { x: 263, y: 1940, delay: 2550 },
    { x: 392, y: 2167, delay: 0 },
    { x: 584, y: 2167, delay: 5100 },
    { x: 776, y: 2167, delay: 0 },
    { x: 968, y: 2167, delay: 5100 },
    { x: 1576, y: 2245, delay: 0 },
    { x: 1624, y: 2245, delay: 5100 },
    { x: 1672, y: 2245, delay: 5100 },
    { x: 1720, y: 2245, delay: 0 },
    { x: 1992, y: 2071, delay: 5100 },
    { x: 2008, y: 2071, delay: 5100 },
    { x: 2568, y: 1351, delay: 0 },
    { x: 2568, y: 1551, delay: 0 },
    { x: 3368, y: 1123, delay: 0 },
    { x: 3864, y: 1170, delay: 0 },
    { x: 3704, y: 1170, delay: 0 },
    { x: 824, y: 2995, delay: 0 },
    { x: 760, y: 2960, delay: 5100 },
    { x: 488, y: 2960, delay: 0 },
    { x: 200, y: 3055, delay: 5100 },
    { x: 88, y: 3055, delay: 5100 },
    { x: 2984, y: 3105, delay: 0 },
    { x: 2984, y: 3125, delay: 5100 },
    { x: 3304, y: 3125, delay: 5100 },
    { x: 3304, y: 3105, delay: 0 },
    { x: 3592, y: 3335, delay: 0 },
    { x: 3592, y: 3115, delay: 5100 },
    { x: 3848, y: 1938, delay: 0 }
  ],

  jumpers: [
    { x: 496, y: 1815, height: -900 },
    { x: 624, y: 1527, height: -900 },
    { x: 1136, y: 2183, height: -900 },
    { x: 4048, y: 2487, height: -900 },
    { x: 3744, y: 2263, height: -900 },
    { x: 3936, y: 1943, height: -1200 },
    { x: 144, y: 3159, height: -1500 },
    { x: 2496, y: 3334, height: -1200 },
    { x: 2240, y: 3655, height: -1200 },
    { x: 1328, y: 3335, height: -1200 },
    { x: 1584, y: 3655, height: -1200 },
    { x: 3889, y: 3330, height: -1200 }
  ],

  slimes: [
    { x: 400, y: 350, point: 400 },
    { x: 800, y: 350, point: 800 },
    { x: 1200, y: 350, point: 1200 },
    { x: 3144, y: 3150, point: 3144 },
    { x: 3470, y: 3310, point: 3470 },
    { x: 345, y: 930, point: 350 },
    { x: 997, y: 930, point: 997 },
    { x: 480, y: 2160, point: 480 },
    { x: 854, y: 2160, point: 854 },
    { x: 1559, y: 1460, point: 1559 },
    { x: 3200, y: 1330, point: 3200 },
    { x: 1043, y: 1570, point: 1043 },
    { x: 3782, y: 1150, point: 3782 },
    { x: 1426, y: 3630, point: 1426 },
    { x: 625, y: 2950, point: 625 },
    { x: 3449, y: 2320, point: 3449 },
    { x: 3726, y: 2465, point: 3726 }
  ],

  skeletons: [
    { x: 683, y: 2160, point: 683 },
    { x: 3142, y: 3310, point: 3142 },
    { x: 3467, y: 3150, point: 3467 },
    { x: 470, y: 1200, point: 470 },
    { x: 1763, y: 1120, point: 1763 },
    { x: 1749, y: 1460, point: 1749 },
    { x: 1485, y: 2225, point: 1485 },
    { x: 971, y: 3630, point: 971 },
    { x: 1136, y: 3630, point: 1136 },
    { x: 975, y: 3015, point: 975 },
    { x: 360, y: 2875, point: 360 },
    { x: 3901, y: 2465, point: 3901 }
  ],

  demons: [
    { x: 3400, y: 2910 },
    { x: 640, y: 2464 }
  ]
};
