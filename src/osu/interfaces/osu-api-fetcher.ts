import Bottleneck from "bottleneck";
import { NodesuApiFetcher } from "../nodesu-api-fetcher";
import { Multiplayer } from "../types/multiplayer";

export interface IOsuApiFetcher {
  fetchMultiplayerResults(banchoMultiplayerId: string): Promise<Multiplayer>;

  isValidBanchoMultiplayerId(banchoMultiplayerId: string): Promise<boolean>;
}

export abstract class OsuApiFetcher implements IOsuApiFetcher {
  protected readonly limiter: Bottleneck = new Bottleneck({
    maxConcurrent: 1,
    minTime: 333
  });

  abstract fetchMultiplayerResults(banchoMultiplayerId: string): Promise<Multiplayer>;

  abstract isValidBanchoMultiplayerId(banchoMultiplayerId: string): Promise<boolean>;
}
