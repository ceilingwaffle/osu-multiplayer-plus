import { ApiOsuUser } from "./api-osu-user";

export interface OsuUserValidationResult {
  isValid: boolean;
  osuUser?: ApiOsuUser;
}
