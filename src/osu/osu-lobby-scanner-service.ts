import { IOsuLobbyScanner } from "./interfaces/osu-lobby-scanner";
import { IOsuApiFetcher } from "./interfaces/osu-api-fetcher";
import { Log } from "../utils/Log";
import { OsuLobbyScannerEventDataMap } from "./interfaces/osu-lobby-scanner-events";
import { ApiMultiplayer } from "./types/api-multiplayer";
import { dynamic, SetIntervalAsyncTimer, clearIntervalAsync } from "set-interval-async";
import { injectable, decorate, inject } from "inversify";
import TYPES from "../types";
import Emittery = require("emittery");
import { MultiplayerResultsListener } from "../multiplayer/multiplayer-results-listener";

interface Watcher {
  multiplayerId: string;
  gameIds: number[];
  startAtMapNumber: number;
  timer: SetIntervalAsyncTimer;
  latestResults?: ApiMultiplayer;
  isScanning?: boolean;
}

// decorate(injectable(), EventEmitter);
decorate(injectable(), Emittery);
// decorate(injectable(), Emittery.Typed);
@injectable()
export class OsuLobbyScannerService extends Emittery.Typed<OsuLobbyScannerEventDataMap> implements IOsuLobbyScanner {
  protected readonly interval: number = 5000;
  protected readonly watching: { [multiplayerId: string]: Watcher } = {};
  protected readonly mpResultsListener: MultiplayerResultsListener = new MultiplayerResultsListener(this);

  constructor(@inject(TYPES.IOsuApiFetcher) private readonly osuApi: IOsuApiFetcher) {
    super();
    Log.info(`Initialized ${this.constructor.name}.`);
    this.registerEventListeners();
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
      const watcher = this.watching[multiplayerId];
      if (!watcher) {
        // This should never happen, but sometimes the timer may be scanning when we call disposeWatcher()
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

  async watch(gameId: number, multiplayerId: string, startAtMapNumber: number = 1): Promise<void> {
    try {
      Log.info(`Watching game ${gameId}, multi ${multiplayerId}...`);
      const watcher: Watcher = this.findWatcher(multiplayerId);
      if (!watcher) {
        this.watching[multiplayerId] = {
          multiplayerId: multiplayerId,
          gameIds: [gameId],
          startAtMapNumber: startAtMapNumber,
          timer: dynamic.setIntervalAsync(async () => await this.scan(multiplayerId), this.interval)
        };
        Log.info("Created new multi watcher");
      } else if (!watcher.gameIds.includes(gameId)) {
        watcher.gameIds.push(gameId);
        Log.info("Added game ID to existing watcher");
      } else {
        throw new Error(`Game ${gameId} invalid or already being watched for multiplayer ${multiplayerId}.`);
      }
    } catch (error) {
      Log.methodError(this.watch, this.constructor.name, error);
      throw error;
    }
  }

  async unwatch(gameId: number, multiplayerId: string): Promise<void> {
    Log.info(`Unwatching game ${gameId}, multi ${multiplayerId}...`);
    const watcher: Watcher = this.findWatcher(multiplayerId);
    if (!watcher) {
      throw new Error(`Multiplayer ${multiplayerId} is not currently being watched.`);
    }
    if (!watcher.gameIds || !watcher.gameIds.find(gameId => gameId === gameId)) {
      throw new Error(`No multiplayer is currently being watched for game ${gameId}.`);
    }

    watcher.gameIds = watcher.gameIds.filter(id => id !== gameId);
    Log.info("Removed game id from watcher");
    if (watcher.gameIds.length < 1) {
      await this.disposeWatcher(multiplayerId);
    }
  }

  isWatching(multiplayerId: string): boolean {
    return !!this.findWatcher(multiplayerId);
  }

  /**
   * Returns true if disposed successfully.
   *
   * @private
   * @param {string} multiplayerId
   * @returns {boolean}
   */
  private async disposeWatcher(multiplayerId: string): Promise<boolean> {
    const watcher: Watcher = this.findWatcher(multiplayerId);
    if (!watcher) {
      throw new Error(`Cannot dispose watcher because no watcher exists for multiplayer ${multiplayerId}.`);
    }
    if (this.watching[multiplayerId].timer) {
      await clearIntervalAsync(this.watching[multiplayerId].timer);
      Log.debug(`Cleared timer for mpid ${multiplayerId}`);
    } else {
      Log.warn(`Watcher for multiplayer ${multiplayerId} did not have a timer for some reason.`);
    }
    const deleted = delete this.watching[multiplayerId];
    if (deleted) {
      Log.debug(`Disposed watcher for multiplayer ${multiplayerId}.`);
    } else {
      Log.warn(`Failed to dispose watcher for multiplayer ${multiplayerId}.`);
    }
    return deleted;
  }

  private findWatcher(multiplayerId: string): Watcher {
    return this.watching[multiplayerId];
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
      const watcher = this.watching[multi.multiplayerId];
      if (multi.matches.length < 1) return false; // there are no new matches if there are no matches
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
