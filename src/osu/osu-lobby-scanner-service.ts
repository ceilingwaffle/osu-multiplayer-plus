import { IOsuLobbyScanner, LobbyWatcherChanged } from "./interfaces/osu-lobby-scanner";
import { IOsuApiFetcher } from "./interfaces/osu-api-fetcher";
import { Log } from "../utils/Log";
import { OsuLobbyScannerEventDataMap } from "./interfaces/osu-lobby-scanner-events";
import { ApiMultiplayer } from "./types/api-multiplayer";
import { dynamic, SetIntervalAsyncTimer, clearIntervalAsync } from "set-interval-async";
import { injectable, inject, decorate } from "inversify";
import TYPES from "../types";
import { MultiplayerResultsListener } from "../multiplayer/multiplayer-results-listener";
import { OsuLobbyScannerWatcher } from "./watcher";
import Emittery = require("emittery"); // don't convert this to an import or we'll get an Object.TypeError error

decorate(injectable(), Emittery);
@injectable()
export class OsuLobbyScannerService extends Emittery.Typed<OsuLobbyScannerEventDataMap> implements IOsuLobbyScanner {
  protected readonly interval: number = 5000;
  protected readonly watchers: { [multiplayerId: string]: OsuLobbyScannerWatcher } = {};
  // protected readonly eventEmitter: Emittery.Typed<OsuLobbyScannerEventDataMap> = new Emittery.Typed<OsuLobbyScannerEventDataMap>();
  protected readonly mpResultsListener: MultiplayerResultsListener = new MultiplayerResultsListener(this);

  constructor(@inject(TYPES.IOsuApiFetcher) private readonly osuApi: IOsuApiFetcher) {
    super();
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
        throw new Error(`A watcher does not exist for multiplayer ID ${multiplayerId}.`);
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

  tryActivateWatchers({ gameId }: { gameId: number }): Promise<LobbyWatcherChanged[]> {
    try {
      const allWatchers: OsuLobbyScannerWatcher[] = this.getWatchers();
      if (!allWatchers.length) {
        throw new Error(`Cannot activate watcher for game ID ${gameId} because no watchers have been created.`);
      }

      // find watchers containing the given game ID
      const targetWatchers: OsuLobbyScannerWatcher[] = allWatchers.filter(w => w.hasGameId(gameId));
      if (!targetWatchers.length) {
        throw new Error(`Cannot activate watcher for game ID ${gameId} because the game ID does not exist on any watchers.`);
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
    this.on("watcherFailed", mpid => {
      // TODO: Fire event for the Lobby class to update its status indicating that an error occurred while it was being scanned for results
      Log.warn("Event watcherFailed", `Watcher failed for mp ${mpid}`);
    });

    this.on("watcherStarted", mpid => {
      // TODO: Fire event for the Lobby class to update its status indicating that it is now being actively scanned for results
      Log.info("Event watcherStarted", `Watcher started for mp ${mpid}`);
    });

    this.on("watcherStopped", mpid => {
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
      if (this.containsNewMatches(results)) {
        watcher.latestResults = results;
        this.emit("newMultiplayerMatches", results);
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
  private containsNewMatches(multi: ApiMultiplayer): boolean {
    // TODO: unit test containsNewMatches
    try {
      // return true;
      if (!multi || !multi.multiplayerId) throw new Error(`No multiplayer results provided.`);
      if (!multi.multiplayerId) throw new Error(`No multiplayer ID provided with multiplayer results.`);
      if (!multi.matches.length) return false; // there can be no new matches if there are no matches
      const watcher = this.watchers[multi.multiplayerId];
      if (!watcher.latestResults) return true;

      const latestKnownMatch = watcher.latestResults.matches.slice(-1)[0];
      const checkingMatch = multi.matches.slice(-1)[0];
      // TODO: More reliable way of determining the answer instead of just not comparing start times at all
      // const latestST = latestKnownMatch.startTime.getTime();
      const latestET = latestKnownMatch.endTime.getTime();
      // const checkingST = checkingMatch.startTime.getTime();
      const checkingET = checkingMatch.endTime.getTime();

      // const answer = latestST !== checkingST && latestET !== checkingET;
      const answer = latestET !== checkingET;
      Log.methodSuccess(this.containsNewMatches, { mpid: multi.multiplayerId, newResults: answer });
      return answer;
    } catch (error) {
      Log.methodError(this.containsNewMatches, this.constructor.name, error);
      throw error;
    }
  }
}
