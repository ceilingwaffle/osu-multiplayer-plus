import { OsuApiFetcher } from "./interfaces/osu-api-fetcher";
import { Multi } from "./types/multi";
import { Log } from "../utils/Log";

export class NodesuApiFetcher implements OsuApiFetcher {
  isValidBanchoMultiplayerId(banchoMultiplayerId: string): Promise<boolean> {
    Log.debug("Validating Bancho MP ID...", banchoMultiplayerId);
    throw new Error("Method not implemented.");
  }
  fetchMultiplayerResults(banchoMultiplayerId: string): Promise<Multi> {
    Log.debug("Fetching match results for Bancho MP ID...", banchoMultiplayerId);
    throw new Error("Method not implemented.");
  }
}
