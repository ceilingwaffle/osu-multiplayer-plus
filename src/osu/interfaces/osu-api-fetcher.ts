import { ApiMultiplayer } from "../types/api-multiplayer";

export interface IOsuApiFetcher {
  fetchMultiplayerResults(banchoMultiplayerId: string): Promise<ApiMultiplayer>;
  isValidBanchoMultiplayerId(banchoMultiplayerId: string): Promise<boolean>;
}
