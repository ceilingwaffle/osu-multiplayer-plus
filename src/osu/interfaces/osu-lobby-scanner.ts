export interface IOsuLobbyScanner {
  // /**
  //  * Starts a watcher to poll for and emit match results for a Bancho multiplayer lobby.
  //  *
  //  * @param {number} gameId The game of the multiplayer lobby.
  //  * @param {string} multiplayerId The Bancho multiplayer ID.
  //  * @param {number} [startAtMapNumber] The multiplayer match-result number to begin at for team-score calculations.
  //  *                                    Player scores within all match-results prior to this number will not be counted.
  //  * @returns {Promise<void>}
  //  */
  // watch(gameId: number, multiplayerId: string, startAtMapNumber?: number): Promise<void>;
  // /**
  //  * Removes a game from being watched for match results.
  //  * If the game was the only remaining game being watched for a specific multiplayer, the watcher will be stopped.
  //  *
  //  * @param {number} gameId The game of the multiplayer lobby.
  //  * @param {multiplayerId} string The Bancho multiplayer ID.
  //  * @returns {Promise<void>}
  //  */
  // unwatch(gameId: number, multiplayerId: string): Promise<void>;
  // /**
  //  * Returns true if the given Bancho multiplayer ID is currently being actively scanned for match results.
  //  *
  //  * @param {string} multiplayerId
  //  * @returns {Promise<boolean>}
  //  */
  // isWatching(multiplayerId: string): boolean;

  tryCreateWatcher({ gameId, multiplayerId }: { gameId: number; multiplayerId: string }): Promise<LobbyWatcherChanged>;
  tryDeleteWatcher({ gameId, multiplayerId }: { gameId: number; multiplayerId: string }): Promise<LobbyWatcherChanged>;
  tryActivateWatchers({ gameId }: { gameId: number }): Promise<LobbyWatcherChanged[]>;
  tryRemoveGameFromWatchers({ gameId }: { gameId: number }): Promise<LobbyWatcherChanged[]>;
}

export interface LobbyWatcherChanged {
  /** The multiplayer ID and game ID affected by the change */
  affected: { multiplayerId: string; gameId: number };
  /** If the multiplayerID targeted by the change is currently being watched */
  isScanning: boolean;
  /** The change performed (null if nothing changed) */
  whatHappened:
    | "createdStoppedWatcher"
    | "deletedWatcher"
    | "stoppedWatcher"
    | "startedWatcher"
    | "addedGameToStoppedWatcher"
    | "addedGameToStartedWatcher"
    | "removedGameFromWatcher"
    | "deactivatedGameInWatcher";
}
