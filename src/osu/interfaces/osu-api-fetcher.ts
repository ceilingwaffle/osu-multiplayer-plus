import { ApiMultiplayer } from "../types/api-multiplayer";

export interface IOsuApiFetcher {
  fetchMultiplayerResults(banchoMultiplayerId: string): Promise<ApiMultiplayer>;
  isValidBanchoMultiplayerId(banchoMultiplayerId: string): Promise<boolean>;
  isValidOsuUsername(username: string): Promise<boolean>;
  isValidOsuUserId(userId: string): Promise<boolean>;
}
