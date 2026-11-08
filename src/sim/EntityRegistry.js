// Every entity that has state gets a stable id (for example "slime-3"), so a message can say
// "slime-3 died". Ids come from the kind and the order in src/data/levelSpawns.js, so every device
// running the same version of the game builds the same ids. Entities with getState()/setState()
// are saved and restored by the registry.
export class EntityRegistry {
  constructor() {
    this.byId = new Map();
    this.counts = {};
  }

  // Registers an entity under `kind`. Uses entity.id if it already has one, otherwise `${kind}-${n}`.
  add(kind, entity) {
    const n = this.counts[kind] ?? 0;
    this.counts[kind] = n + 1;

    entity.kind = kind;
    entity.id = entity.id ?? `${kind}-${n}`;
    if (this.byId.has(entity.id)) {
      throw new Error(`Duplicate entity id: ${entity.id}`);
    }
    this.byId.set(entity.id, entity);
    return entity;
  }

  get(id) {
    return this.byId.get(id);
  }

  ids() {
    return [...this.byId.keys()];
  }

  // { id: state } of every entity that can be saved.
  getStates() {
    const states = {};
    for (const [id, entity] of this.byId) {
      if (entity.getState) states[id] = entity.getState();
    }
    return states;
  }

  // Restores the entities listed in `states`; ids that are not registered are ignored.
  // `options` go to each setState (see applySpriteState).
  setStates(states, options) {
    for (const [id, state] of Object.entries(states)) {
      this.byId.get(id)?.setState?.(state, options);
    }
  }
}
