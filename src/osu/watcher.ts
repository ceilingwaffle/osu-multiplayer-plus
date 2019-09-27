import { Log } from "../utils/Log";
import { ApiMultiplayer } from "./types/api-multiplayer";
import { SetIntervalAsyncTimer } from "set-interval-async";

// export interface IOsuLobbyScannerWatcher {
//   readonly multiplayerId: string;
//   readonly waitingGameIds: Set<number>;
//   readonly activeGameIds: Set<number>;
//   latestResults?: ApiMultiplayer;
//   // startAtMapNumber: number;
//   timer: SetIntervalAsyncTimer;
//   hasGameId(gameId: number): boolean;
//   hasActiveGameId(gameId: number): boolean;
//   hasWaitingGameId(gameId: number): boolean;
//   tryDeleteActiveGameId(gameId: number): boolean;
//   tryDeleteWaitingGameId(gameId: number): boolean;
//   tryAddActiveGameId(gameId: number): boolean;
//   tryAddWaitingGameId(gameId: number): boolean;
//   countAllGames(): number;
//   countActiveGames(): number;
//   countWaitingGames(): number;
//   activateGameId(gameId: number): boolean;
//   deactivateGameId(gameId: number): boolean;
//   isScanning(): boolean;
// }

/**
 * Used to store info about multiplayer lobbies being polled for match results.
 *
 * -- Explanation of how this class works (and how the OsuLobbyScanner class works) --
 * The user creates a game. Then adds a lobby to that game. When a new never-seen-before lobby is added to a game, a new stopped-watcher is
 * created for that lobby. The game ID is added to "waitingGameIds" (regardless of whether or not the lobby has been seen before.)
 * When the user starts the game, a setInterval-style timer is created and added to the watcher. This timer calls some method to poll the
 * osu API to fetch new multiplayer match results. The game ID is moved from "waitingGameIds" to "activeGameIds".
 * When the game ends, the watcher is disposed (unless the same lobby is currently being watched for another active game. If this is true,
 * then any references to the game ID are deleted from the watcher).
 *
 * @export
 * @class OsuLobbyScannerWatcher
 */
export class OsuLobbyScannerWatcher {
  readonly multiplayerId: string;
  readonly waitingGameIds: Set<number> = new Set<number>();
  readonly activeGameIds: Set<number> = new Set<number>();
  latestResults?: ApiMultiplayer;
  // startAtMapNumber: number;
  timer: SetIntervalAsyncTimer;

  constructor(multiplayerId: string) {
    this.multiplayerId = multiplayerId;
  }

  hasGameId(gameId: number): boolean {
    return this.hasWaitingGameId(gameId) || this.hasActiveGameId(gameId);
  }

  hasActiveGameId(gameId: number): boolean {
    return this.activeGameIds.has(gameId);
  }

  hasWaitingGameId(gameId: number): boolean {
    return this.waitingGameIds.has(gameId);
  }

  tryDeleteActiveGameId(gameId: number): boolean {
    return this.activeGameIds.delete(gameId);
  }

  tryDeleteWaitingGameId(gameId: number): boolean {
    return this.waitingGameIds.delete(gameId);
  }

  tryAddActiveGameId(gameId: number): boolean {
    const sizeBefore = this.activeGameIds.size;
    this.activeGameIds.add(gameId);
    const sizeAfter = this.activeGameIds.size;
    return sizeAfter > sizeBefore;
  }

  tryAddWaitingGameId(gameId: number): boolean {
    const sizeBefore = this.waitingGameIds.size;
    this.waitingGameIds.add(gameId);
    const sizeAfter = this.waitingGameIds.size;
    return sizeAfter > sizeBefore;
  }

  countAllGames(): number {
    return this.waitingGameIds.size + this.activeGameIds.size;
  }

  countActiveGames(): number {
    return this.activeGameIds.size;
  }

  countWaitingGames(): number {
    return this.waitingGameIds.size;
  }

  activateGameId(gameId: number): boolean {
    const waitingWasDeleted = this.tryDeleteWaitingGameId(gameId);
    const activeWasAdded = this.tryAddActiveGameId(gameId);
    if (waitingWasDeleted) Log.info(`Removed waiting game ID ${gameId} in watcher for MP ID ${this.multiplayerId}.`);
    if (activeWasAdded) Log.info(`Added active game ID ${gameId} in watcher for MP ID ${this.multiplayerId}.`);
    return activeWasAdded;
  }

  deactivateGameId(gameId: number): boolean {
    const activeWasDeleted = this.tryDeleteActiveGameId(gameId);
    const waitingWasAdded = this.tryAddWaitingGameId(gameId);
    if (activeWasDeleted) Log.info(`Removed active game ID ${gameId} in watcher for MP ID ${this.multiplayerId}.`);
    if (waitingWasAdded) Log.info(`Added waiting game ID ${gameId} in watcher for MP ID ${this.multiplayerId}.`);
    return waitingWasAdded;
  }

  isScanning(): boolean {
    return !!this.timer;
  }
}
