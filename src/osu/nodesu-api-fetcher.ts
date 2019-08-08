import Nodesu = require("nodesu");
import { OsuApiFetcher } from "./interfaces/osu-api-fetcher";
import { Log } from "../utils/Log";
import { Multiplayer } from "./types/multiplayer";
import { NodesuApiTransformer } from "./nodesu-api-transformer";

export class NodesuApiFetcher extends OsuApiFetcher {
  protected readonly api: Nodesu.Client = new Nodesu.Client(process.env.OSU_API_KEY, { parseData: true });

  constructor() {
    super();
  }

  async isValidBanchoMultiplayerId(banchoMultiplayerId: string): Promise<boolean> {
    throw new Error("Method not implemented.");

    if (isNaN(Number(banchoMultiplayerId))) {
      return false;
    }

    Log.debug("Validating Bancho MP ID...", banchoMultiplayerId);
  }

  async fetchMultiplayerResults(banchoMultiplayerId: string): Promise<Multiplayer> {
    Log.debug("Fetching match results for Bancho MP ID...", banchoMultiplayerId);
    const result = await this.limiter.schedule(() => this.api.multi.getMatch(Number(banchoMultiplayerId)));

    if (result instanceof Nodesu.Multi) {
      return NodesuApiTransformer.transformMultiplayer(result);
    }
  }
}
