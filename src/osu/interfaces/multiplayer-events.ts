import { Multiplayer } from "../types/multiplayer";

export interface MultiplayerEvents {
  /**
   * "Hey it's time to scan a multi" event. Fired in the timer for each multi ID in the watcher.
   *
   * @type {[string]} Bancho Multiplayer ID of the multi being scanned.
   */
  scan: [string];
  /**
   * *New* multiplayer matches were fetched (not previously fetched).
   * May include matches that have not finished yet (if the MatchEvent is "match_start").
   *
   * @type {[Multiplayer]}
   */
  newMultiplayerMatches: [Multiplayer];
}
