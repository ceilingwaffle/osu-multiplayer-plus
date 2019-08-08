import { OsuApiFetcher, IOsuApiFetcher } from "./interfaces/osu-api-fetcher";
import iocContainer from "../inversify.config";
import * as entities from "../inversify.entities";
import { NodesuApiFetcher } from "./nodesu-api-fetcher";
import { Log } from "../utils/Log";
import { Multi } from "./types/old/multi";
import { OsuMultiplayerService } from "./osu-multiplayer-service";
const { setIntervalAsync, clearIntervalAsync } = require("set-interval-async/dynamic");
import Bottleneck from "bottleneck";

/**
 * pass the interface around classes.   e.g. BeatmapController.getMapTitle() calls IBeatmap.getMapTitle()

LobbyScanner can just use nodesu objects, but it should always return custom objects containing whatever we need - add props to these custom objects whenever the need arises
 */

interface Watching {
  timer: NodeJS.Timer;
  forGameIds: number[];
  banchoMultiplayerId: string;
}

export class OsuLobbyWatcher {
  protected static config = {
    lobbyScanInterval: 1000
  };
  protected api: IOsuApiFetcher = OsuApiFetcher.getInstance();
  protected multiplayerService: OsuMultiplayerService = iocContainer.get(entities.OsuMultiplayerService);
  protected watchers: { [banchoMpId: string]: Watching } = {};
  protected latestMultiResults: Multi;

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

      return Log.methodSuccess(this.watch, this.constructor.name);
    } catch (error) {
      Log.methodError(this.watch, this.constructor.name, `Error when trying to start watcher for MP ${banchoMultiplayerId}.`, error);
      throw error;
    }
  }

  public async unwatch({ banchoMultiplayerId, gameId }: { banchoMultiplayerId: string; gameId?: number }): Promise<void> {
    try {
      if (!gameId) {
        // since no game ID was specified, we are saying we want the watcher removed for the Bancho multiplayer, not just one specific game
        await this.disposeWatcher(banchoMultiplayerId);
        return Log.methodSuccess(this.unwatch, this.constructor.name, `No longer watching MP ${banchoMultiplayerId}.`);
      }
      // watcher no longer needed for a specific game ID; keep the watcher in case other games still need it
      this.removeGameIdFromWatcher({ banchoMultiplayerId, gameId });
      return Log.methodSuccess(this.unwatch, this.constructor.name, `Removed game ID ${gameId} from watcher of MP ${banchoMultiplayerId}.`);
    } catch (error) {
      Log.methodError(this.unwatch, this.constructor.name, `Error when trying to unwatch MP ${banchoMultiplayerId}.`, error);
      throw error;
    }
  }

  private addGameIdToExistingWatcher({ banchoMultiplayerId, gameId }: { banchoMultiplayerId: string; gameId: number }): void {
    const watcher = this.findWatcher(banchoMultiplayerId);
    if (!watcher) {
      throw new Error(`Cannot add game id to watcher because a watcher does not exist for MP ${banchoMultiplayerId}.`);
    }
    watcher.forGameIds.push(gameId);
    Log.debug(`Added game id ${gameId} to existing watcher for MP ${banchoMultiplayerId}.`);
  }

  private removeGameIdFromWatcher({ banchoMultiplayerId, gameId }: { banchoMultiplayerId: string; gameId: number }): void {
    const watcher = this.findWatcher(banchoMultiplayerId);
    if (!watcher) {
      throw new Error(`Cannot remove game id from watcher because a watcher does not exist for MP ${banchoMultiplayerId}.`);
    }
    watcher.forGameIds = watcher.forGameIds.filter(watcherGameId => watcherGameId !== gameId);
    Log.debug(`Removed game id ${gameId} from watcher for MP ${banchoMultiplayerId}.`);
  }

  private createWatcherTimer({ banchoMultiplayerId }: { banchoMultiplayerId: string }): NodeJS.Timer {
    Log.debug(`Creating watcher timer for MP ${banchoMultiplayerId}...`);
    return setInterval(async () => await this.fetchMultiplayerResults(banchoMultiplayerId), OsuLobbyWatcher.config.lobbyScanInterval);
  }

  private async fetchMultiplayerResults(banchoMultiplayerId: string) {
    try {
      Log.debug(`Fetching match results for MP ${banchoMultiplayerId}...`);
      const multiResults = await this.api.fetchMultiplayerResults(banchoMultiplayerId);
      if (multiResults.isOlderThan(this.latestMultiResults)) {
        return Log.info(`No new results yet for MP ${banchoMultiplayerId}. Skipping report creation.`);
      }

      this.setLatestResults(multiResults);
      this.emit(multiResults);
      Log.debug(`Successfully scanned multiplayer results for MP ${banchoMultiplayerId}.`);

      // const report = this.multiplayerService.processMultiplayerResults(multiResults).buildReport();
    } catch (error) {
      Log.error(`Error during mp results scan for MP ${banchoMultiplayerId}.`, error);
      throw error;
    }
  }

  private addNewWatcher({
    timer,
    gameId,
    banchoMultiplayerId
  }: {
    timer: NodeJS.Timer;
    gameId?: number;
    banchoMultiplayerId: string;
  }): void {
    if (this.findWatcher(banchoMultiplayerId)) {
      throw new Error(
        `Watcher already exists for MP ${banchoMultiplayerId}. Did you mean to use ${this.addGameIdToExistingWatcher.name}(<gameId>)?`
      );
    }
    this.watchers[banchoMultiplayerId] = { timer: timer, forGameIds: [gameId], banchoMultiplayerId: banchoMultiplayerId };
    return Log.debug(`Added new watcher for MP ${banchoMultiplayerId}.`);

    // // update existing
    // if (!watcher.forGameIds) {
    //   watcher.forGameIds = [];
    // }
    // if (gameId && !watcher.forGameIds.includes(gameId)) {
    //   watcher.forGameIds.push(gameId);
    // }
    // watcher.timer = timer;
    // Log.debug(`Updated existing watcher for MP ${banchoMultiplayerId}.`);
  }

  private async disposeWatcher(banchoMultiplayerId: string): Promise<void> {
    Log.debug(`Disposing watcher for MP ${banchoMultiplayerId}...`);
    await clearIntervalAsync(this.watchers[banchoMultiplayerId].timer);
    this.watchers[banchoMultiplayerId] = undefined;
    Log.debug(`Disposed watcher for MP ${banchoMultiplayerId}.`);
  }

  private setLatestResults(multiResults: Multi): void {
    this.latestMultiResults = multiResults;
  }

  private findWatcher(banchoMultiplayerId: string): Watching {
    return this.watchers[banchoMultiplayerId];
  }

  private isWatching(banchoMultiplayerId: string): boolean {
    return !!this.findWatcher(banchoMultiplayerId);
  }
}
