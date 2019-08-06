import { Multi } from "../types/multi";

export interface OsuApiFetcher {
  fetchMultiplayerResults(banchoMultiplayerId: string): Promise<Multi>;

  isValidBanchoMultiplayerId(banchoMultiplayerId: string): Promise<boolean>;
}
