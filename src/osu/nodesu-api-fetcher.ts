import Nodesu = require("nodesu");
import { IOsuApiFetcher } from "./interfaces/osu-api-fetcher";
import { Log } from "../utils/Log";
import { ApiMultiplayer } from "./types/api-multiplayer";
import { NodesuApiTransformer } from "./nodesu-api-transformer";
import Bottleneck from "bottleneck";
import { Helpers } from "../utils/helpers";
import { OsuUserValidationResult } from "./types/osu-user-validation-result";

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
      if (isNaN(Number(banchoMultiplayerId))) {
        Log.debug(`Validation failed for Bancho MP: ${banchoMultiplayerId} is NaN.`);
        return false;
      }

      const mp = await this.api.multi.getMatch(Number(banchoMultiplayerId));

      // Assume that if the response did not resolve into a Multi object, then it was not a valid ID.
      // This will only work if { parseData: true } is set in the Nodesu client options.
      if (!(mp instanceof Nodesu.Multi)) {
        Log.methodFailure(
          this.isValidBanchoMultiplayerId,
          this.constructor.name,
          `Validation failed for Bancho MPID ${banchoMultiplayerId}: mp not instanceof Nodesu.Multi.`
        );
        return false;
      }

      if (!mp.match) {
        Log.methodFailure(
          this.isValidBanchoMultiplayerId,
          this.constructor.name,
          `Validation failed for Bancho MPID ${banchoMultiplayerId}: mp.match was undefined.`
        );
        return false;
      }

      if (mp.match.matchId.toString() !== banchoMultiplayerId) {
        Log.methodFailure(
          this.isValidBanchoMultiplayerId,
          this.constructor.name,
          `Validation failed for Bancho MPID ${banchoMultiplayerId}: mp.match.matchId was not equal to mpid (this could mean the lobby was once valid, but has expired.).`
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

  async fetchMultiplayerResults(banchoMultiplayerId: string): Promise<ApiMultiplayer> {
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

  async isValidOsuUsername(username: string): Promise<OsuUserValidationResult> {
    try {
      Log.debug(`Validating osu username ${username} using osu API...`);

      const user: object | Nodesu.User = await this.api.user.get(username, null, null, Nodesu.LookupType.string);
      // Assume that if the response did not resolve into a Nodesu User object, then it was not a valid user ID.
      // This will only work if { parseData: true } is set in the Nodesu client options.
      if (!user || !(user instanceof Nodesu.User)) {
        Log.methodFailure(
          this.isValidOsuUsername,
          this.constructor.name,
          `Validation failed for Bancho osu! username ${username}: User object not instanceof Nodesu.User`
        );
        return { isValid: false };
      }

      if (!user.username) {
        Log.methodFailure(
          this.isValidOsuUsername,
          this.constructor.name,
          `Validation failed for Bancho osu! username ${username}: User object has no username. This should never happen.`
        );
        return { isValid: false };
      }

      Log.methodSuccess(this.isValidOsuUsername, this.constructor.name);
      return {
        isValid: true,
        osuUser: NodesuApiTransformer.transformOsuUser(user)
      };
    } catch (error) {
      Log.methodError(this.isValidOsuUsername, this.constructor.name, error);
      throw error;
    }
  }

  async isValidOsuUserId(banchoUserId: string): Promise<OsuUserValidationResult> {
    try {
      Log.debug(`Validating osu user ID ${banchoUserId} using osu API...`);
      if (isNaN(Number(banchoUserId))) {
        Log.warn(`Validation failed - osu user ID ${banchoUserId} is NaN.`);
        return { isValid: false };
      }

      if (!Helpers.looksLikeAnOsuApiUserId(banchoUserId)) {
        Log.methodFailure(
          this.isValidOsuUserId,
          this.constructor.name,
          `osu! user ID ${banchoUserId} doesn't look like a valid osu! user ID.`
        );
        return { isValid: false };
      }

      const user: object | Nodesu.User = await this.api.user.get(banchoUserId, null, null, Nodesu.LookupType.id);
      // Assume that if the response did not resolve into a Nodesu User object, then it was not a valid user ID.
      // This will only work if { parseData: true } is set in the Nodesu client options.
      if (!user || !(user instanceof Nodesu.User)) {
        Log.methodFailure(
          this.isValidOsuUserId,
          this.constructor.name,
          `Validation failed for Bancho osu! user ID ${banchoUserId}: user not instanceof Nodesu.User`
        );
        return { isValid: false };
      }

      if (!user.username) {
        Log.methodFailure(
          this.isValidOsuUserId,
          this.constructor.name,
          `Validation failed for Bancho osu user ID ${banchoUserId}: user has no username. This should never happen.`
        );
        return { isValid: false };
      }

      Log.methodSuccess(this.isValidOsuUserId, this.constructor.name);
      return {
        isValid: true,
        osuUser: NodesuApiTransformer.transformOsuUser(user)
      };
    } catch (error) {
      Log.methodError(this.isValidOsuUserId, this.constructor.name, error);
      throw error;
    }
  }
}
