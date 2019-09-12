import { ApiMultiplayer } from "../types/api-multiplayer";
import { OsuUserValidationResult } from "../types/osu-user-validation-result";

export interface IOsuApiFetcher {
  fetchMultiplayerResults(banchoMultiplayerId: string): Promise<ApiMultiplayer>;
  isValidBanchoMultiplayerId(banchoMultiplayerId: string): Promise<boolean>;
  isValidOsuUsername(username: string): Promise<OsuUserValidationResult>;
  isValidOsuUserId(userId: string): Promise<OsuUserValidationResult>;
}
