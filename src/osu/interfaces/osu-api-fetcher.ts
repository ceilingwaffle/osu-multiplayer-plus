import { Multiplayer } from "../types/multiplayer";

export interface IOsuApiFetcher {
  fetchMultiplayerResults(banchoMultiplayerId: string): Promise<Multiplayer>;
  isValidBanchoMultiplayerId(banchoMultiplayerId: string): Promise<boolean>;
}
