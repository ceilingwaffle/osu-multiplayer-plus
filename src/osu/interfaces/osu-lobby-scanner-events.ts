import { ApiMultiplayer } from "../types/api-multiplayer";

export type OsuLobbyScannerEventDataMap = {
  newMultiplayerMatches: ApiMultiplayer;
  watcherStarted: string;
  watcherStopped: string;
  watcherFailed: string;
};

export interface OsuLobbyScannerEvents {
  /**
   * *New* multiplayer matches were fetched (not previously fetched).
   * May include matches that have not finished yet (if the MatchEvent is "match_start").
   *
   * @type {[ApiMultiplayer]} The Multiplayer object containing new matches.
   */
  newMultiplayerMatches: [ApiMultiplayer];

  /**
   * Fired when a watcher was successfully activated and is now running.
   *
   * @type {[string]} Bancho Multiplayer ID of the watcher.
   */
  watcherStarted: [string];

  /**
   * Fired when a watcher was safely stopped (e.g. when a game ends)
   *
   * @type {[string]} Bancho Multiplayer ID of the watcher.
   */
  watcherStopped: [string];

  /**
   * Fired when a watcher unexpectedly stopped watching (e.g. network error)
   *
   * @type {[string]} Bancho Multiplayer ID of the watcher.
   */
  watcherFailed: [string];
}
