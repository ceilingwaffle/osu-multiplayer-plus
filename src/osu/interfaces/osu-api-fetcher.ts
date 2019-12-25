import { ApiMultiplayer } from "../types/api-multiplayer";
import { OsuUserValidationResult } from "../types/osu-user-validation-result";
import { ApiOsuUser } from "../types/api-osu-user";
import { ApiBeatmap } from "../types/api-beatmap";

export interface IOsuApiFetcher {
  fetchMultiplayerResults(banchoMultiplayerId: string): Promise<ApiMultiplayer>;
  fetchBeatmap(beatmapId: string): Promise<ApiBeatmap>;
  isValidBanchoMultiplayerId(banchoMultiplayerId: string): Promise<boolean>;
  isValidOsuUsername(username: string): Promise<OsuUserValidationResult>;
  isValidOsuUserId(userId: string): Promise<OsuUserValidationResult>;
  getUserDataForUserId(userId: string): Promise<ApiOsuUser>;
}
