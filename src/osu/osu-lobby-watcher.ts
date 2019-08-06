import { OsuApiFetcher } from "./interfaces/osu-api-fetcher";
import iocContainer from "../inversify.config";
import { NodesuApiFetcher } from "./nodesu-api-fetcher";
import { Log } from "../utils/Log";
import { Multi } from "./types/multi";
import { SetIntervalAsyncTimer } from "set-interval-async";
const { setIntervalAsync, clearIntervalAsync } = require("set-interval-async/dynamic");

/**
 * pass the interface around classes.   e.g. BeatmapController.getMapTitle() calls IBeatmap.getMapTitle()

LobbyScanner can just use nodesu objects, but it should always return custom objects containing whatever we need - add props to these custom objects whenever the need arises
 */

interface Watching {
  timer: SetIntervalAsyncTimer;
  forGameIds: number[];
  banchoMultiplayerId: string;
}

export class OsuLobbyWatcher {
  protected static config = {
    lobbyScanInterval: 5000
  };
  protected watchers: { [banchoMpId: string]: Watching } = {};
  protected osuApi: OsuApiFetcher = iocContainer.get(NodesuApiFetcher);
  protected latestResults: Multi;

  public async watch({
    banchoMultiplayerId,
    gameId,
    startAtMapNumber = 1
  }: {
    banchoMultiplayerId: string;
    gameId: number;
    startAtMapNumber: number;
  }): Promise<void> {
    // await this.osuApi.isValidBanchoMultiplayerId(banchoMpId); // shouldnt be resposibile for validation?

    try {
      if (!this.isWatching(banchoMultiplayerId)) {
        const timer = this.createWatcherTimer({ banchoMultiplayerId });
        this.addNewWatcher({ timer, gameId, banchoMultiplayerId });
      } else {
        this.addGameIdToExistingWatcher({ gameId, banchoMultiplayerId });
      }

      Log.methodSuccess(this.watch, this.constructor.name, `No longer watching MP ID ${banchoMultiplayerId}.`);
    } catch (error) {
      Log.methodError(this.watch, this.constructor.name, `Error when trying to start watcher for MP ID ${banchoMultiplayerId}.`, error);
      throw error;
    }
  }

  public async unwatch({ banchoMultiplayerId, gameId }: { banchoMultiplayerId: string; gameId?: number }): Promise<void> {
    try {
      if (!gameId) {
        // since no game ID was specified, we are saying we want the watcher removed for the Bancho multiplayer, not just one specific game
        await this.disposeWatcher(banchoMultiplayerId);
        return Log.methodSuccess(this.unwatch, this.constructor.name, `No longer watching MP ID ${banchoMultiplayerId}.`);
      }
      // watcher no longer needed for a specific game ID; keep the watcher in case other games still need it
      this.removeGameIdFromWatcher({ banchoMultiplayerId, gameId });
      return Log.methodSuccess(
        this.unwatch,
        this.constructor.name,
        `Removed game ID ${gameId} from watcher of MP ID ${banchoMultiplayerId}.`
      );
    } catch (error) {
      Log.methodError(this.unwatch, this.constructor.name, `Error when trying to unwatch MP ID ${banchoMultiplayerId}.`, error);
      throw error;
    }
  }

  private addGameIdToExistingWatcher({ banchoMultiplayerId, gameId }: { banchoMultiplayerId: string; gameId: number }): void {
    const watcher = this.findWatcher(banchoMultiplayerId);
    if (!watcher) {
      throw new Error(`Cannot add game id to watcher because a watcher does not exist for MP ID ${banchoMultiplayerId}.`);
    }
    watcher.forGameIds.push(gameId);
    Log.debug(`Added game id ${gameId} to existing watcher for MP ID ${banchoMultiplayerId}.`);
  }

  private removeGameIdFromWatcher({ banchoMultiplayerId, gameId }: { banchoMultiplayerId: string; gameId: number }): void {
    const watcher = this.findWatcher(banchoMultiplayerId);
    if (!watcher) {
      throw new Error(`Cannot remove game id from watcher because a watcher does not exist for MP ID ${banchoMultiplayerId}.`);
    }
    watcher.forGameIds = watcher.forGameIds.filter(watcherGameId => watcherGameId !== gameId);
    Log.debug(`Removed game id ${gameId} from watcher for MP ID ${banchoMultiplayerId}.`);
  }

  private createWatcherTimer({ banchoMultiplayerId }: { banchoMultiplayerId: string }): SetIntervalAsyncTimer {
    Log.debug(`Creating watcher timer for MP ID ${banchoMultiplayerId}...`);
    return setIntervalAsync(async () => {
      try {
        // TODO: finish implementing this method
        const multiResults = await this.osuApi.fetchMultiplayerResults(banchoMultiplayerId);

        if (multiResults.isOlderThan(this.latestResults)) {
          return Log.info(`No new results yet for MP ID ${banchoMultiplayerId}. Skipping report creation.`);
        }

        this.setLatestResults(multiResults);

        const report = this.multiplayerService.processMultiplayerResults(multiResults).buildReport();

        Log.debug(`Successfully scanned multiplayer results for MP ID ${banchoMultiplayerId}.`);
      } catch (error) {
        Log.error(`Error during mp results scan for MP ID ${banchoMultiplayerId}.`, error);
        throw error;
      }
    }, OsuLobbyWatcher.config.lobbyScanInterval);
  }

  private addNewWatcher({
    timer,
    gameId,
    banchoMultiplayerId
  }: {
    timer: SetIntervalAsyncTimer;
    gameId?: number;
    banchoMultiplayerId: string;
  }): void {
    if (this.findWatcher(banchoMultiplayerId)) {
      throw new Error(
        `Watcher already exists for MP ID ${banchoMultiplayerId}. Did you mean to use ${this.addGameIdToExistingWatcher.name}(<gameId>)?`
      );
    }
    this.watchers[banchoMultiplayerId] = { timer: timer, forGameIds: [gameId], banchoMultiplayerId: banchoMultiplayerId };
    return Log.debug(`Added new watcher for MP ID ${banchoMultiplayerId}.`);

    // // update existing
    // if (!watcher.forGameIds) {
    //   watcher.forGameIds = [];
    // }
    // if (gameId && !watcher.forGameIds.includes(gameId)) {
    //   watcher.forGameIds.push(gameId);
    // }
    // watcher.timer = timer;
    // Log.debug(`Updated existing watcher for MP ID ${banchoMultiplayerId}.`);
  }

  private async disposeWatcher(banchoMultiplayerId: string): Promise<void> {
    Log.debug(`Disposing watcher for MP ID ${banchoMultiplayerId}...`);
    await clearIntervalAsync(this.watchers[banchoMultiplayerId].timer);
    this.watchers[banchoMultiplayerId] = undefined;
    Log.debug(`Disposed watcher for MP ID ${banchoMultiplayerId}.`);
  }

  private setLatestResults(multiResults: Multi): void {
    this.latestResults = multiResults;
  }

  private findWatcher(banchoMultiplayerId: string): Watching {
    return this.watchers[banchoMultiplayerId];
  }

  private isWatching(banchoMultiplayerId: string): boolean {
    return !!this.findWatcher(banchoMultiplayerId);
  }
}
