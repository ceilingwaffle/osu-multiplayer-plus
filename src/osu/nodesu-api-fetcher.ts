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
    // NOTE: 50ms = 1000ms/20 (where 20 is the max requests per second allowed by the osu API).
    // I think we need permission from peppy to obtain this limit.
    // Seems to pause requests when we hit 60 requests within a minute, then resumes at the next minute.
    // Use minTime 1000ms (1 req per second) until we obtain elevated permissions.
    //
    // The more lobbies we add to the scanner, the higher the delay between retrieving results. See notes for maxConcurrent.
    minTime: 1000,
    // While we're osu API ratelimited to 60 req per 60s, maxConcurrent is equivalent to the maximum number of seconds between API
    // requests per job. e.g. if we are scanning 15 lobbies, each lobby will be scanned about once per 15 seconds (keep in mind,
    // there may be other API requests happening, like isValidBanchoMultiplayerId, meaning the lobby scan delay may be higher).
    maxConcurrent: 15
    // strategy: Bottleneck.strategy.LEAK,
  });

  private constructor() {
    this.registerEventListeners();
  }

  private registerEventListeners() {
    this.limiter.on("depleted", function(empty) {
      // This will be called every time the reservoir drops to 0.
      // The `empty` (boolean) argument indicates whether `limiter.empty()` is currently true.
      Log.warn(`Bottleneck reservoir depleted in ${this.constructor.name}.`);
    });
  }

  public static getInstance(): IOsuApiFetcher {
    if (!NodesuApiFetcher.instance) {
      NodesuApiFetcher.instance = new NodesuApiFetcher();
    }
    return NodesuApiFetcher.instance;
  }

  async isValidBanchoMultiplayerId(banchoMultiplayerId: string): Promise<boolean> {
    try {
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
        Log.methodFailure(
          this.isValidBanchoMultiplayerId,
          this.constructor.name,
          `Validation failed for Bancho MPID ${mpid}: mp not instanceof Nodesu.Multi.`
        );
        return false;
      }

      if (!mp.match) {
        Log.methodFailure(
          this.isValidBanchoMultiplayerId,
          this.constructor.name,
          `Validation failed for Bancho MPID ${mpid}: mp.match was undefined.`
        );
        return false;
      }

      if (mp.match.matchId !== mpid) {
        Log.methodFailure(
          this.isValidBanchoMultiplayerId,
          this.constructor.name,
          `Validation failed for Bancho MPID ${mpid}: mp.match.matchId was not equal to mpid (this could mean the lobby was once valid, but has expired.).`
        );
        return false;
      }

      Log.methodSuccess(this.isValidBanchoMultiplayerId, this.constructor.name);
      return true;
    } catch (error) {
      Log.methodError(this.isValidBanchoMultiplayerId, this.constructor.name, error);
      throw error;
    }
  }

  async fetchMultiplayerResults(banchoMultiplayerId: string): Promise<Multiplayer> {
    try {
      const result = await this.limiter.schedule(() => this.api.multi.getMatch(Number(banchoMultiplayerId)));
      if (result instanceof Nodesu.Multi) {
        const transformed = NodesuApiTransformer.transformMultiplayer(result);
        Log.methodSuccess(
          this.fetchMultiplayerResults,
          this.constructor.name,
          `Fetched match results for Bancho MP ${banchoMultiplayerId}`
        );
        return transformed;
      } else {
        Log.methodFailure(this.fetchMultiplayerResults, this.constructor.name, "Match result was not instanceof Nodesu.Multi");
        return null;
      }
    } catch (error) {
      Log.methodFailure(this.fetchMultiplayerResults, this.constructor.name, error);
      throw error;
    }
  }
}
