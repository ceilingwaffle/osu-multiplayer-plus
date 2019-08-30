import { EventEmitter } from "events";
// import { SetIntervalAsyncTimer, dynamic } from "set-interval-async";
import { IOsuLobbyScanner } from "./interfaces/osu-lobby-scanner";
import { NodesuApiFetcher } from "./nodesu-api-fetcher";
import { IOsuApiFetcher } from "./interfaces/osu-api-fetcher";
import { Log } from "../utils/Log";
import { Multiplayer } from "./types/multiplayer";

interface Watcher {
  multiplayerId: string;
  gameIds: number[];
  startAtMapNumber: number;
  timer: NodeJS.Timer;
}

export class OsuLobbyScannerService extends EventEmitter implements IOsuLobbyScanner {
  protected readonly api: IOsuApiFetcher = NodesuApiFetcher.getInstance();
  protected readonly interval: number = 5000;
  protected readonly watching: { [multiplayerId: string]: Watcher } = {};

  constructor() {
    super();
    Log.info(`Initialized ${this.constructor.name}`);

    this.addListener("scan", this.action);

    this.on("new-multiplayer-match-results", results => {
      // TODO: Use TypedEvent instead of casing with 'as'
      const mp = results as Multiplayer;
      Log.info("Event new-multiplayer-match-results", { mpid: mp.multiplayerId, matches: mp.matches.length });
    });
  }

  protected async action(multiplayerId: string, startAtMapNumber: number): Promise<void> {
    Log.info(`Scanning mp ${multiplayerId}...`);
    const results = await this.api.fetchMultiplayerResults(multiplayerId);
    // TODO: emit only if new results
    this.emit("new-multiplayer-match-results", results);
  }

  async watch(gameId: number, multiplayerId: string, startAtMapNumber: number = 1): Promise<void> {
    Log.info(`Watching game ${gameId}, multi ${multiplayerId}...`);
    const watcher: Watcher = this.findWatcher(multiplayerId);
    if (!watcher) {
      this.watching[multiplayerId] = {
        multiplayerId: multiplayerId,
        gameIds: [gameId],
        startAtMapNumber: startAtMapNumber,
        timer: setInterval(() => this.emit("scan", multiplayerId), this.interval)
      };
      Log.info("Created new multi watcher");
    } else if (!watcher.gameIds.includes(gameId)) {
      watcher.gameIds.push(gameId);
      Log.info("Added game ID to existing watcher");
    } else {
      throw new Error(`Game ${gameId} invalid or already being watched for multiplayer ${multiplayerId}.`);
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
      this.disposeWatcher(multiplayerId);
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
  private disposeWatcher(multiplayerId: string): boolean {
    const watcher: Watcher = this.findWatcher(multiplayerId);
    if (!watcher) {
      throw new Error(`Cannot dispose watcher because no watcher exists for multiplayer ${multiplayerId}.`);
    }
    if (this.watching[multiplayerId].timer) {
      clearInterval(this.watching[multiplayerId].timer);
    } else {
      Log.warn(`Watcher for multiplayer ${multiplayerId} did not have a timer for some reason.`);
    }
    const deleted = delete this.watching[multiplayerId];
    if (deleted) {
      Log.info(`Disposed watcher for multiplayer ${multiplayerId}.`);
    } else {
      Log.warn(`Failed to dispose watcher for multiplayer ${multiplayerId}.`);
    }
    return deleted;
  }

  private findWatcher(multiplayerId: string): Watcher {
    return this.watching[multiplayerId];
  }

  // private handle(): SetIntervalAsyncTimer {
  //   return dynamic.setIntervalAsync(() => this.emit("scan"), this.interval);
  // }

  // private async scan(mpId: string): Promise<void> {
  //   console.log(`Scanning multi ${mpId}.... If new match results, emit messages to scanning.find(mpid).gameIds`);
  // }
}
