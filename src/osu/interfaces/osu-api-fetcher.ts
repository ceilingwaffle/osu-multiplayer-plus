import Bottleneck from "bottleneck";
import { NodesuApiFetcher } from "../nodesu-api-fetcher";
import { Multiplayer } from "../types/multiplayer";

export interface IOsuApiFetcher {
  fetchMultiplayerResults(banchoMultiplayerId: string): Promise<Multiplayer>;

  isValidBanchoMultiplayerId(banchoMultiplayerId: string): Promise<boolean>;
}

export abstract class OsuApiFetcher implements IOsuApiFetcher {
  private static instance: IOsuApiFetcher;

  protected readonly limiter: Bottleneck = new Bottleneck({
    maxConcurrent: 1,
    minTime: 333
  });

  static getInstance(): IOsuApiFetcher {
    if (!OsuApiFetcher.instance) {
      OsuApiFetcher.instance = new NodesuApiFetcher();
    }
    return OsuApiFetcher.instance;
  }

  abstract fetchMultiplayerResults(banchoMultiplayerId: string): Promise<Multiplayer>;

  abstract isValidBanchoMultiplayerId(banchoMultiplayerId: string): Promise<boolean>;
}