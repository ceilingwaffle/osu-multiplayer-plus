import { IOsuLobbyScanner, LobbyWatcherChanged } from "../../src/osu/interfaces/osu-lobby-scanner";
import { injectable } from "inversify";
import { TestHelpers } from "../test-helpers";

@injectable()
export class FakeOsuLobbyScanner implements IOsuLobbyScanner {
  tryCreateWatcher({ gameId, multiplayerId }: { gameId: number; multiplayerId: string }): Promise<LobbyWatcherChanged> {
    TestHelpers.logFakeImplementationWarning(this.tryCreateWatcher.name);
    throw new Error("Method not implemented.");
  }

  tryDeleteWatcher({ gameId, multiplayerId }: { gameId: number; multiplayerId: string }): Promise<LobbyWatcherChanged> {
    TestHelpers.logFakeImplementationWarning(this.tryDeleteWatcher.name);
    throw new Error("Method not implemented.");
  }

  tryActivateWatchers({ gameId }: { gameId: number }): Promise<LobbyWatcherChanged[]> {
    TestHelpers.logFakeImplementationWarning(this.tryActivateWatchers.name);
    throw new Error("Method not implemented.");
  }

  tryRemoveGameFromWatchers({ gameId }: { gameId: number }): Promise<LobbyWatcherChanged[]> {
    TestHelpers.logFakeImplementationWarning(this.tryRemoveGameFromWatchers.name);
    throw new Error("Method not implemented.");
  }

  // protected readonly interval: number = 5000;
  // protected readonly watching: { [multiplayerId: string]: Watcher } = {};
  // async watch(gameId: number, multiplayerId: string, startAtMapNumber?: number): Promise<void> {
  //   TestHelpers.logFakeImplementationWarning(this.watch.name);
  //   const watcher: Watcher = this.findWatcher(multiplayerId);
  //   if (!watcher) {
  //     this.watching[multiplayerId] = {
  //       multiplayerId: multiplayerId,
  //       gameIds: [gameId],
  //       startAtMapNumber: startAtMapNumber,
  //       timer: setInterval(() => {
  //         return;
  //       }, this.interval)
  //     };
  //   } else if (!watcher.gameIds.includes(gameId)) {
  //     watcher.gameIds.push(gameId);
  //   } else {
  //     throw new Error(`Game ${gameId} invalid or already being watched for multiplayer ${multiplayerId}.`);
  //   }
  // }
  // async unwatch(gameId: number, multiplayerId: string): Promise<void> {
  //   TestHelpers.logFakeImplementationWarning(this.unwatch.name);
  //   const watcher: Watcher = this.findWatcher(multiplayerId);
  //   if (!watcher) {
  //     throw new Error(`Multiplayer ${multiplayerId} is not currently being watched.`);
  //   }
  //   if (!watcher.gameIds || !watcher.gameIds.find(gameId => gameId === gameId)) {
  //     throw new Error(`No multiplayer is currently being watched for game ${gameId}.`);
  //   }
  //   watcher.gameIds = watcher.gameIds.filter(id => id !== gameId);
  //   if (watcher.gameIds.length < 1) {
  //     await this.disposeWatcher(multiplayerId);
  //   }
  // }
  // isWatching(multiplayerId: string): boolean {
  //   TestHelpers.logFakeImplementationWarning(this.watch.name);
  //   return !!this.findWatcher(multiplayerId);
  // }
  // private findWatcher(multiplayerId: string): Watcher {
  //   return this.watching[multiplayerId];
  // }
  // private async disposeWatcher(multiplayerId: string): Promise<boolean> {
  //   const watcher: Watcher = this.findWatcher(multiplayerId);
  //   if (!watcher) {
  //     throw new Error(`Cannot dispose watcher because no watcher exists for multiplayer ${multiplayerId}.`);
  //   }
  //   if (this.watching[multiplayerId].timer) {
  //     clearInterval(this.watching[multiplayerId].timer);
  //   }
  //   const deleted = delete this.watching[multiplayerId];
  //   return deleted;
  // }
}
