import Nodesu = require("nodesu");
import { IOsuApiFetcher } from "./interfaces/osu-api-fetcher";
import { Log } from "../utils/Log";
import { Multiplayer } from "./types/multiplayer";
import { NodesuApiTransformer } from "./nodesu-api-transformer";
import Bottleneck from "bottleneck";

/**
 * Singleton
 *
 * @export
 * @class NodesuApiFetcher
 * @implements {IOsuApiFetcher}
 */
export class NodesuApiFetcher implements IOsuApiFetcher {
  private static instance: IOsuApiFetcher;
  protected readonly api: Nodesu.Client = new Nodesu.Client(process.env.OSU_API_KEY, { parseData: true });
  protected readonly limiter: Bottleneck = new Bottleneck({
    maxConcurrent: 1,
    minTime: 333
  });

  private constructor() {}

  public static getInstance(): IOsuApiFetcher {
    if (!NodesuApiFetcher.instance) {
      NodesuApiFetcher.instance = new NodesuApiFetcher();
    }
    return NodesuApiFetcher.instance;
  }

  async isValidBanchoMultiplayerId(banchoMultiplayerId: string): Promise<boolean> {
    Log.debug(`Validating Bancho MP ${banchoMultiplayerId} using osu API...`);
    const mpid = Number(banchoMultiplayerId);
    if (isNaN(mpid)) {
      Log.debug(`Validation failed for Bancho MP: ${mpid} is NaN.`);
      return false;
    }

    const mp = await this.api.multi.getMatch(mpid);

    // Assume that if the response did not resolve into a Multi object, then it was not a valid ID.
    // This will only work if { parseData: true } is set in the Nodesu client options.
    if (!(mp instanceof Nodesu.Multi)) {
      Log.debug(`Validation failed for Bancho MPID ${mpid}: mp not instanceof Nodesu.Multi.`);
      return false;
    }

    if (!mp.match) {
      Log.debug(`Validation failed for Bancho MPID ${mpid}: mp.match was undefined.`);
      return false;
    }

    if (mp.match.matchId !== mpid) {
      Log.debug(
        `Validation failed for Bancho MPID ${mpid}: mp.match.matchId was not equal to mpid (this could mean the lobby was once valid, but has expired.).`
      );
      return false;
    }

    Log.methodSuccess(this.isValidBanchoMultiplayerId, this.constructor.name);
    return true;
  }

  async fetchMultiplayerResults(banchoMultiplayerId: string): Promise<Multiplayer> {
    Log.debug("Fetching match results for Bancho MP...", banchoMultiplayerId);
    const result = await this.limiter.schedule(() => this.api.multi.getMatch(Number(banchoMultiplayerId)));

    if (result instanceof Nodesu.Multi) {
      return NodesuApiTransformer.transformMultiplayer(result);
    } else {
      return null;
    }
  }
}
