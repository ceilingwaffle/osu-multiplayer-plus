import { ApiMultiplayer } from "../types/api-multiplayer";
import { OsuUserValidationResult } from "../types/osu-user-validation-result";
import { ApiOsuUser } from "../types/api-osu-user";

export interface IOsuApiFetcher {
  fetchMultiplayerResults(banchoMultiplayerId: string): Promise<ApiMultiplayer>;
  isValidBanchoMultiplayerId(banchoMultiplayerId: string): Promise<boolean>;
  isValidOsuUsername(username: string): Promise<OsuUserValidationResult>;
  isValidOsuUserId(userId: string): Promise<OsuUserValidationResult>;
  getUserDataForUserId(userId: string): Promise<ApiOsuUser>;
}
