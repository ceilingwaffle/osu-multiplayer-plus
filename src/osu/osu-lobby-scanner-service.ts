import { IOsuLobbyScanner, LobbyWatcherChanged } from "./interfaces/osu-lobby-scanner";
import { IOsuApiFetcher } from "./interfaces/osu-api-fetcher";
import { Log } from "../utils/Log";
import { ApiMultiplayer } from "./types/api-multiplayer";
import { dynamic, SetIntervalAsyncTimer, clearIntervalAsync } from "set-interval-async";
import { injectable, inject, decorate } from "inversify";
import TYPES from "../types";
import { MultiplayerResultsListener } from "../multiplayer/classes/multiplayer-results-listener";
import { OsuLobbyScannerWatcher } from "./watcher";
import Emittery = require("emittery"); // don't convert this to an import or we'll get an Object.TypeError error
import cloneDeep = require("lodash/cloneDeep");
import _ = require("lodash"); // do not convert to default import -- it will break!!

decorate(injectable(), Emittery);
@injectable()
export class OsuLobbyScannerService implements IOsuLobbyScanner {
  protected readonly interval: number = 5000;
  protected readonly watchers: { [multiplayerId: string]: OsuLobbyScannerWatcher } = {};
  // protected readonly eventEmitter: Emittery.Typed<OsuLobbyScannerEventDataMap> = new Emittery.Typed<OsuLobbyScannerEventDataMap>();
  // protected readonly mpResultsListener: MultiplayerResultsListener = new MultiplayerResultsListener(this);

  constructor(
    @inject(TYPES.IOsuApiFetcher) private readonly osuApi: IOsuApiFetcher,
    @inject(TYPES.MultiplayerResultsListener) protected readonly mpResultsListener: MultiplayerResultsListener
  ) {
    Log.info(`Initialized ${this.constructor.name}.`);
    this.registerEventListeners();
  }

  tryCreateWatcher({ gameId, multiplayerId }: { gameId: number; multiplayerId: string }): Promise<LobbyWatcherChanged> {
    try {
      Log.info(`Trying to create multiplayer watcher...`, { gameId, multiplayerId });
      let watcher: OsuLobbyScannerWatcher = this.findWatcher(multiplayerId);
      if (!watcher) {
        watcher = this.watchers[multiplayerId] = new OsuLobbyScannerWatcher(multiplayerId);

        Log.info("Created multiplayer watcher.", { gameId, multiplayerId });
        if (watcher.tryAddWaitingGameId(gameId)) {
          Log.info("Added game ID to waiting gameIds on existing multiplayer watcher.", { gameId, multiplayerId });
        }
        Log.methodSuccess(this.tryCreateWatcher, this.constructor.name);
        return Promise.resolve({
          affected: { multiplayerId: multiplayerId, gameId: gameId },
          isScanning: false,
          whatHappened: "createdStoppedWatcher"
        });
      } else if (!watcher.hasGameId(gameId)) {
        if (watcher.tryAddWaitingGameId(gameId)) {
          Log.info("Added game ID to waiting gameIds on existing multiplayer watcher.", { gameId, multiplayerId });
        }
        Log.methodSuccess(this.tryCreateWatcher, this.constructor.name);
        return Promise.resolve({
          affected: { multiplayerId: multiplayerId, gameId: gameId },
          isScanning: false,
          whatHappened: "addedGameToStoppedWatcher"
        });
      } else {
        throw new Error(`Game ID ${gameId} invalid or already added to the watcher for multiplayer ID ${multiplayerId}.`);
      }
    } catch (error) {
      Log.methodError(this.tryCreateWatcher, this.constructor.name, error);
      throw error;
    }
  }

  async tryDeleteWatcher({ gameId, multiplayerId }: { gameId: number; multiplayerId: string }): Promise<LobbyWatcherChanged> {
    try {
      Log.info(`Trying to delete multiplayer watcher...`, { gameId, multiplayerId });
      const watcher: OsuLobbyScannerWatcher = this.findWatcher(multiplayerId);
      if (!watcher) {
        Log.info(`Cannot delete watcher because a watcher does not exist for multiplayer ID ${multiplayerId}.`);
        return;
      }

      // remove this game ID from the watcher
      if (watcher.tryDeleteActiveGameId(gameId)) {
        Log.info(`Removed active game ID ${gameId} in watcher for MP ID ${multiplayerId}.`);
      }
      if (watcher.tryDeleteWaitingGameId(gameId)) {
        Log.info(`Removed waiting game ID ${gameId} in watcher for MP ID ${multiplayerId}.`);
      }

      // if other games are using this watcher, do not delete the watcher
      if (watcher.countAllGames() > 0) {
        Log.info(`Not deleting watcher for multiplayer ${multiplayerId}. Other games are using this watcher.`);
        return {
          affected: { gameId: gameId, multiplayerId: multiplayerId },
          isScanning: watcher.isScanning(),
          whatHappened: "removedGameFromWatcher"
        };
      }

      // delete the watcher
      const disposed = await this.disposeWatcher(multiplayerId);
      if (!disposed) {
        throw new Error(`Something went wrong when trying to delete the watcher for multiplayer ${multiplayerId}.`);
      }

      return {
        affected: { gameId: gameId, multiplayerId: multiplayerId },
        isScanning: false,
        whatHappened: "deletedWatcher"
      };
    } catch (error) {
      Log.methodError(this.tryDeleteWatcher, this.constructor.name, error);
      throw error;
    }
  }

  async tryActivateWatchers({ gameId }: { gameId: number }): Promise<LobbyWatcherChanged[]> {
    try {
      const allWatchers: OsuLobbyScannerWatcher[] = this.getWatchers();
      if (!allWatchers.length) {
        Log.warn(`Cannot activate watcher for game ID ${gameId} because no watchers have been created.`);
        return;
      }

      // find watchers containing the given "waiting" game ID
      const targetWatchers: OsuLobbyScannerWatcher[] = allWatchers.filter(w => w.hasWaitingGameId(gameId));
      if (!targetWatchers.length) {
        Log.warn(`Cannot activate watcher for game ID ${gameId} because the game ID does not exist on any watchers.`);
        return;
      }

      const affectedWatchers: LobbyWatcherChanged[] = [];
      for (const watcher of targetWatchers) {
        // move waiting game to active
        if (watcher.tryDeleteWaitingGameId(gameId)) {
          Log.info(`Removed waiting game ID ${gameId} in watcher for MP ID ${watcher.multiplayerId}.`);
        }
        if (watcher.tryAddActiveGameId(gameId)) {
          Log.info(`Added active game ID ${gameId} in watcher for MP ID ${watcher.multiplayerId}.`);
        }

        // start scanning if not currently scanning
        let startedWatcher: boolean = false;
        if (!watcher.isScanning()) {
          watcher.timer = this.makeWatcherTimer(watcher.multiplayerId);
          startedWatcher = true;
          Log.info(`Started watcher for MP ID ${watcher.multiplayerId}.`);
        } else if (watcher.latestResults) {
          // Emit latest API results to the newly-activated game.
          // We only want to signal that new results are ready for a single game.
          // To do this, we clone the latest API results and replace all targetGameIds with just the game ID activated in this method.
          Log.info(`Emitting latest (cached) API results to newly-activated game ID ${gameId}.`);
          const multiplayerResultsCopy = cloneDeep(watcher.latestResults);
          multiplayerResultsCopy.targetGameIds = new Set<number>([gameId]);
          await this.mpResultsListener.eventEmitter.emit("newMultiplayerMatches", multiplayerResultsCopy);
        }

        affectedWatchers.push({
          affected: { gameId: gameId, multiplayerId: watcher.multiplayerId },
          isScanning: watcher.isScanning(),
          whatHappened: startedWatcher ? "startedWatcher" : "addedGameToStartedWatcher"
        });
      }

      Log.methodSuccess(this.tryActivateWatchers, this.constructor.name);
      return Promise.all(affectedWatchers);
    } catch (error) {
      Log.methodError(this.tryActivateWatchers, this.constructor.name, error);
      throw error;
    }
  }

  async tryRemoveGameFromWatchers({ gameId }: { gameId: number }): Promise<LobbyWatcherChanged[]> {
    try {
      const allWatchers: OsuLobbyScannerWatcher[] = this.getWatchers();
      if (!allWatchers.length) {
        Log.info(`Cannot deactivate watcher for game ID ${gameId} because no watchers have been created.`);
        return;
      }

      // find watchers containing the given game ID
      const targetWatchers: OsuLobbyScannerWatcher[] = allWatchers.filter(w => w.hasGameId(gameId));
      if (!targetWatchers.length) {
        Log.info(`Cannot deactivate watcher for game ID ${gameId} because the game ID does not exist on any watchers.`);
        return;
      }

      const affectedWatchers: LobbyWatcherChanged[] = [];
      for (const watcher of targetWatchers) {
        // completely remove game from watchers
        if (watcher.tryDeleteActiveGameId(gameId)) {
          Log.info(`Removed active game ID ${gameId} in watcher for MP ID ${watcher.multiplayerId}.`);
        }
        if (watcher.tryDeleteWaitingGameId(gameId)) {
          Log.info(`Removed waiting game ID ${gameId} in watcher for MP ID ${watcher.multiplayerId}.`);
        }

        let disposedWatcher: boolean = false;
        let stoppedWatcher: boolean = false;
        if (!watcher.countAllGames()) {
          // completely dispose the watcher if no games remain (waiting or active)
          Log.info(`Disposing watcher for MP ID ${watcher.multiplayerId}...`);
          await this.disposeWatcher(watcher.multiplayerId);
          disposedWatcher = true;
          Log.info(`Disposed watcher for MP ID ${watcher.multiplayerId}.`);
        } else if (watcher.isScanning() && !watcher.countActiveGames()) {
          // stop scanning if currently scanning and no active games
          Log.info(`Stopping watcher for MP ID ${watcher.multiplayerId}.`);
          await this.stopScannerTimer(watcher.multiplayerId);
          stoppedWatcher = true;
          Log.info(`Stopped watcher for MP ID ${watcher.multiplayerId}.`);
        }

        affectedWatchers.push({
          affected: { gameId: gameId, multiplayerId: watcher.multiplayerId },
          isScanning: watcher.isScanning(),
          whatHappened: disposedWatcher ? "deletedWatcher" : stoppedWatcher ? "stoppedWatcher" : "deactivatedGameInWatcher"
        });
      }

      Log.methodSuccess(this.tryRemoveGameFromWatchers, this.constructor.name);
      return Promise.all(affectedWatchers);
    } catch (error) {
      Log.methodError(this.tryRemoveGameFromWatchers, this.constructor.name, error);
      throw error;
    }
  }

  private registerEventListeners() {
    this.mpResultsListener.eventEmitter.on("watcherFailed", mpid => {
      // TODO: Fire event for the Lobby class to update its status indicating that an error occurred while it was being scanned for results
      Log.warn("Event watcherFailed", `Watcher failed for mp ${mpid}`);
    });

    this.mpResultsListener.eventEmitter.on("watcherStarted", mpid => {
      // TODO: Fire event for the Lobby class to update its status indicating that it is now being actively scanned for results
      Log.info("Event watcherStarted", `Watcher started for mp ${mpid}`);
    });

    this.mpResultsListener.eventEmitter.on("watcherStopped", mpid => {
      // TODO: Fire event for the Lobby class to update its status indicating that it is no longer being scanned for results
      Log.warn("Event watcherStopped", `Watcher stopped for mp ${mpid}`);
    });
  }

  private async scan(multiplayerId: string): Promise<void> {
    try {
      const watcher = this.watchers[multiplayerId];
      if (!watcher) {
        // This should never happen, but I suppose it's possible that the timer may be coincidentally in the process of scanning when we call disposeWatcher()
        Log.warn(`No watcher defined for multiplayer ${multiplayerId}`);
        return;
      }
      // TODO: Update Lobby status to UNKNOWN if connection/API issue
      Log.info(`Scanning mp ${multiplayerId}...`);
      const results = await this.osuApi.fetchMultiplayerResults(multiplayerId);
      if (this.containsNewMatchesForAnyGame(results, watcher.activeGameIds) === true) {
        results.targetGameIds = watcher.activeGameIds;
        watcher.latestResults = results;
        await this.mpResultsListener.eventEmitter.emit("newMultiplayerMatches", results);
      }
    } catch (error) {
      Log.methodError(this.scan, this.constructor.name, error);
      throw error;
    }
  }

  private makeWatcherTimer(multiplayerId: string): SetIntervalAsyncTimer {
    return dynamic.setIntervalAsync(async () => await this.scan(multiplayerId), this.interval);
  }

  private getWatchers(): OsuLobbyScannerWatcher[] {
    var watchers: OsuLobbyScannerWatcher[] = [];
    for (var prop in this.watchers) {
      if (this.watchers.hasOwnProperty(prop)) {
        watchers.push(this.watchers[prop]);
      }
    }
    return watchers;
  }

  /**
   * Returns true if disposed successfully.
   *
   * @private
   * @param {string} multiplayerId
   * @returns {boolean}
   */
  private async disposeWatcher(multiplayerId: string): Promise<boolean> {
    const watcher: OsuLobbyScannerWatcher = this.findWatcher(multiplayerId);
    if (!watcher) {
      throw new Error(`Cannot dispose watcher because no watcher exists for multiplayer ${multiplayerId}.`);
    }
    if (this.watchers[multiplayerId].timer) {
      await this.stopScannerTimer(multiplayerId);
      Log.debug(`Cleared timer for mpid ${multiplayerId}`);
    } else {
      Log.warn(`Watcher for multiplayer ${multiplayerId} did not have a timer for some reason.`);
    }
    const deleted = delete this.watchers[multiplayerId];
    if (deleted) {
      Log.debug(`Disposed watcher for multiplayer ${multiplayerId}.`);
    } else {
      Log.warn(`Failed to dispose watcher for multiplayer ${multiplayerId}.`);
    }
    return deleted;
  }

  private async stopScannerTimer(multiplayerId: string): Promise<void> {
    await clearIntervalAsync(this.watchers[multiplayerId].timer);
  }

  private findWatcher(multiplayerId: string): OsuLobbyScannerWatcher {
    return this.watchers[multiplayerId];
  }

  /**
   * Compares the match start time and end time of previous most-recent fetched multiplayer matches with the given multiplayer matches.
   *
   * @private
   * @param {ApiMultiplayer} multi The multiplayer results being checked for new results
   * @returns {boolean} true if the given multiplayer results contain new results
   */
  private containsNewMatchesForAnyGame(multi: ApiMultiplayer, gameIds: Set<number>): boolean {
    // TODO: unit test containsNewMatches
    try {
      // return true;
      if (!multi || !multi.multiplayerId) throw new Error(`No multiplayer results provided.`);
      if (!multi.multiplayerId) throw new Error(`No multiplayer ID provided with multiplayer results.`);
      if (!multi.matches.length) return false; // there can be no new matches if there are no matches
      const watcher = this.watchers[multi.multiplayerId];
      if (!watcher) {
        Log.methodFailure(this.containsNewMatchesForAnyGame, this.constructor.name, "Watcher is undefined. Returning false.");
        return false;
      }
      if (!watcher.latestResults) return true;

      // if (!this.allGameIdsActiveOnWatcher(watcher.latestResults.targetGameIds, gameIds)) {
      //   // may not actually contain new matches, but a game has been added since the scanner started for this lobby, so we should deliver the results to that game
      //   Log.methodSuccess(
      //     this.containsNewMatchesForAnyGame,
      //     `A new game was added to the lobby scanner for mp ${multi.multiplayerId} - should deliver results.`,
      //     { mpid: multi.multiplayerId, newResults: true }
      //   );
      //   return true;
      // }

      const latest = watcher.latestResults.matches.slice(-1)[0];
      const checking = multi.matches.slice(-1)[0];
      const latestST = latest.startTime;
      const latestET = latest.endTime;
      const latestBMID = latest.beatmap?.beatmapId;
      const checkingST = checking.startTime;
      const checkingET = checking.endTime;
      const checkingBMID = checking.beatmap?.beatmapId;

      // TODO: Thoroughly test the answer value... This may not be 100% accurate for every new/old match result.
      let answer: boolean;
      if (!Object.is(latestBMID, checkingBMID) || !Object.is(latestST, checkingST) || !Object.is(latestET, checkingET)) {
        // if the beatmap ID is different, it must be a new match
        // if the start time is different, it must be a new match
        // if the end time is different, it must be a new match
        answer = true;
      } else {
        answer = false;
      }

      // const answer = latestST !== checkingST && latestET !== checkingET;
      // const answer = ((!isNaN(latestET) && isNaN(checkingET)) || (isNaN(latestET) && !isNaN(checkingET))) && latestET != checkingET;
      Log.methodSuccess(this.containsNewMatchesForAnyGame, { mpid: multi.multiplayerId, newResults: answer });
      return answer;
    } catch (error) {
      Log.methodError(this.containsNewMatchesForAnyGame, this.constructor.name, error);
      throw error;
    }
  }

  // /**
  //  * Returns true if every element in gameIds is present in targetGameIds.
  //  *
  //  * @private
  //  * @param {Set<number>} targetGameIds
  //  * @param {Set<number>} gameIds
  //  * @returns {boolean}
  //  */
  // private allGameIdsActiveOnWatcher(targetGameIds: Set<number>, gameIds: Set<number>): boolean {
  //   // return _.xor(Array.from(targetGameIds), Array.from(gameIds)).length === 0;
  //   return Array.from(gameIds).every(gid => Array.from(targetGameIds).includes(gid));
  // }
}
