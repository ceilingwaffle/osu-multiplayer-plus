import { Log } from "../utils/Log";
import { ApiMultiplayer } from "./types/api-multiplayer";
import { SetIntervalAsyncTimer } from "set-interval-async";

// export interface IOsuLobbyScannerWatcher {
//   readonly multiplayerId: string;
//   readonly inactiveGameIds: Set<number>;
//   readonly activeGameIds: Set<number>;
//   latestResults?: ApiMultiplayer;
//   // startAtMapNumber: number;
//   timer: SetIntervalAsyncTimer;
//   hasGameId(gameId: number): boolean;
//   hasActiveGameId(gameId: number): boolean;
//   hasInactiveGameId(gameId: number): boolean;
//   tryDeleteActiveGameId(gameId: number): boolean;
//   tryDeleteInactiveGameId(gameId: number): boolean;
//   tryAddActiveGameId(gameId: number): boolean;
//   tryAddInactiveGameId(gameId: number): boolean;
//   countAllGames(): number;
//   countActiveGames(): number;
//   countInactiveGames(): number;
//   activateGameId(gameId: number): boolean;
//   deactivateGameId(gameId: number): boolean;
//   isScanning(): boolean;
// }

export class OsuLobbyScannerWatcher {
  readonly multiplayerId: string;
  readonly inactiveGameIds: Set<number> = new Set<number>();
  readonly activeGameIds: Set<number> = new Set<number>();
  latestResults?: ApiMultiplayer;
  // startAtMapNumber: number;
  timer: SetIntervalAsyncTimer;

  constructor(multiplayerId: string) {
    this.multiplayerId = multiplayerId;
  }

  hasGameId(gameId: number): boolean {
    return this.hasInactiveGameId(gameId) || this.hasActiveGameId(gameId);
  }

  hasActiveGameId(gameId: number): boolean {
    return this.activeGameIds.has(gameId);
  }

  hasInactiveGameId(gameId: number): boolean {
    return this.inactiveGameIds.has(gameId);
  }

  tryDeleteActiveGameId(gameId: number): boolean {
    return this.activeGameIds.delete(gameId);
  }

  tryDeleteInactiveGameId(gameId: number): boolean {
    return this.inactiveGameIds.delete(gameId);
  }

  tryAddActiveGameId(gameId: number): boolean {
    const sizeBefore = this.activeGameIds.size;
    this.activeGameIds.add(gameId);
    const sizeAfter = this.activeGameIds.size;
    return sizeAfter > sizeBefore;
  }

  tryAddInactiveGameId(gameId: number): boolean {
    const sizeBefore = this.inactiveGameIds.size;
    this.inactiveGameIds.add(gameId);
    const sizeAfter = this.inactiveGameIds.size;
    return sizeAfter > sizeBefore;
  }

  countAllGames(): number {
    return this.inactiveGameIds.size + this.activeGameIds.size;
  }

  countActiveGames(): number {
    return this.activeGameIds.size;
  }

  countInactiveGames(): number {
    return this.inactiveGameIds.size;
  }

  activateGameId(gameId: number): boolean {
    const inactiveWasDeleted = this.tryDeleteInactiveGameId(gameId);
    const activeWasAdded = this.tryAddActiveGameId(gameId);
    if (inactiveWasDeleted) Log.info(`Removed inactive game ID ${gameId} in watcher for MP ID ${this.multiplayerId}.`);
    if (activeWasAdded) Log.info(`Added active game ID ${gameId} in watcher for MP ID ${this.multiplayerId}.`);
    return activeWasAdded;
  }

  deactivateGameId(gameId: number): boolean {
    const activeWasDeleted = this.tryDeleteActiveGameId(gameId);
    const inactiveWasAdded = this.tryAddInactiveGameId(gameId);
    if (activeWasDeleted) Log.info(`Removed active game ID ${gameId} in watcher for MP ID ${this.multiplayerId}.`);
    if (inactiveWasAdded) Log.info(`Added inactive game ID ${gameId} in watcher for MP ID ${this.multiplayerId}.`);
    return inactiveWasAdded;
  }

  isScanning(): boolean {
    return !!this.timer;
  }
}
