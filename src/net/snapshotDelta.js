// Makes snapshots small enough to send 20 times a second. A full snapshot of the level is ~17 KB;
// most entities do not change between two snapshots, so only what changed is sent.
//
//   quantizeSnapshot(snapshot)         rounds the numbers (positions to 0.1 px, velocities to whole px/s)
//   diffSnapshot(previous, next)       the message body with only what changed since `previous`
//   applyDelta(base, delta)            the full snapshot you get by applying a delta to `base`
//
// Both sides keep the last full snapshot; the host sends a full one when the guest arrives.
const ROUNDING = {
  x: 10,
  y: 10,
  vx: 1,
  vy: 1,
  progress: 100,
  jumpBufferMs: 1
};

export function quantizeSnapshot(snapshot) {
  const entities = {};
  for (const [id, state] of Object.entries(snapshot.entities)) {
    const rounded = {};
    for (const [key, value] of Object.entries(state)) {
      const factor = ROUNDING[key];
      rounded[key] = factor && typeof value === "number" ? Math.round(value * factor) / factor : value;
    }
    entities[id] = rounded;
  }
  return { ...snapshot, game: JSON.parse(JSON.stringify(snapshot.game)), entities };
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function diffSnapshot(previous, next) {
  if (!previous) {
    return { full: true, tick: next.tick, game: next.game, entities: next.entities };
  }

  const delta = { full: false, tick: next.tick, entities: {} };
  if (!same(previous.game, next.game)) delta.game = next.game;

  for (const [id, state] of Object.entries(next.entities)) {
    const before = previous.entities[id];
    if (!before) {
      delta.entities[id] = state;
      continue;
    }
    const changed = {};
    for (const [key, value] of Object.entries(state)) {
      if (!same(before[key], value)) changed[key] = value;
    }
    if (Object.keys(changed).length > 0) delta.entities[id] = changed;
  }
  return delta;
}

export function applyDelta(base, delta) {
  if (delta.full || !base) {
    return {
      version: base?.version ?? 1,
      tick: delta.tick,
      game: JSON.parse(JSON.stringify(delta.game)),
      entities: JSON.parse(JSON.stringify(delta.entities))
    };
  }

  const entities = JSON.parse(JSON.stringify(base.entities));
  for (const [id, changes] of Object.entries(delta.entities)) {
    entities[id] = { ...entities[id], ...changes };
  }
  return {
    version: base.version,
    tick: delta.tick,
    game: delta.game ? JSON.parse(JSON.stringify(delta.game)) : base.game,
    entities
  };
}
