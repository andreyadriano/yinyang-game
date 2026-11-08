// Things that happened in the game, announced on gameState.events after the state already changed.
// The host announces them and (online) the guest plays the matching effects; sounds, the HUD and
// the network layer can listen without the code that causes them knowing about any of that.
//
// Payloads:
//   SOUL_LOST        { amount, source, soulCount }   source = id of the enemy or hazard
//   PLAYER_HIT       { id }                          a player was pushed back and hurt
//   ENEMY_HURT       { id, kind }                    an enemy started its hurt state
//   ENEMY_DEFEATED   { id, kind }                    an enemy finished dying
//   KEY_COLLECTED    { key }                         "yellow" or "blue"
//   BARRIER_OPENED   { id }
//   BOSS_DEFEATED    { id, total }
//   JAIL_DOOR_OPENED {}                              the door started opening
//   GAME_OVER        {}
//   ENDGAME          {}                              the game was won
export const GAME_EVENT = {
  SOUL_LOST: "soul-lost",
  PLAYER_HIT: "player-hit",
  ENEMY_HURT: "enemy-hurt",
  ENEMY_DEFEATED: "enemy-defeated",
  KEY_COLLECTED: "key-collected",
  BARRIER_OPENED: "barrier-opened",
  BOSS_DEFEATED: "boss-defeated",
  JAIL_DOOR_OPENED: "jail-door-opened",
  GAME_OVER: "game-over",
  ENDGAME: "endgame"
};
