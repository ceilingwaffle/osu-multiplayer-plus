import Nodesu = require("nodesu");
import { IOsuApiFetcher } from "./interfaces/osu-api-fetcher";
import { Log } from "../utils/log";
import { ApiMultiplayer } from "./types/api-multiplayer";
import { NodesuApiTransformer } from "./nodesu-api-transformer";
import Bottleneck from "bottleneck";
import { Helpers } from "../utils/helpers";
import { OsuUserValidationResult } from "./types/osu-user-validation-result";
import { injectable } from "inversify";
import { ApiOsuUser } from "./types/api-osu-user";
import { ApiBeatmap } from "./types/api-beatmap";

/**
 * Singleton
 *
 * @export
 * @class NodesuApiFetcher
 * @implements {IOsuApiFetcher}
 */
@injectable()
export class NodesuApiFetcher implements IOsuApiFetcher {
  // TODO: Some way to not allow this class to be accessed directly - only via the DIC.
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

  constructor() {
    Log.debug(`Initialized ${this.constructor.name}`);
    this.registerEventListeners();
  }

  private registerEventListeners() {
    this.limiter.on("depleted", function(empty) {
      // This will be called every time the reservoir drops to 0.
      // The `empty` (boolean) argument indicates whether `limiter.empty()` is currently true.
      Log.warn(`Bottleneck reservoir depleted in ${this.constructor.name}.`);
    });
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

  async fetchBeatmap(beatmapId: string): Promise<ApiBeatmap> {
    try {
      const result = await this.limiter.schedule(() => this.api.beatmaps.getByBeatmapId(Number(beatmapId)));
      if (!result) {
        Log.methodFailure(this.fetchBeatmap, this.constructor.name, `No beatmap result was fetched for bmid ${beatmapId}.`);
        return null;
      }
      const resultBeatmap = result[0];
      if (resultBeatmap instanceof Nodesu.Beatmap) {
        const transformed = NodesuApiTransformer.transformBeatmap(resultBeatmap);
        Log.methodSuccess(this.fetchBeatmap, this.constructor.name, `Fetched beatmap for Beatmap ID ${beatmapId}.`);
        return transformed;
      } else {
        Log.methodFailure(this.fetchBeatmap, this.constructor.name, "Beatmap was not instanceof Nodesu.Beatmap.");
        return null;
      }
    } catch (error) {
      Log.methodFailure(this.fetchBeatmap, this.constructor.name, error);
      throw error;
    }
  }

  async isValidOsuUsername(username: string): Promise<OsuUserValidationResult> {
    try {
      Log.debug(`Validating osu username ${username} using osu API...`);

      const user: ApiOsuUser = await this.getUserDataForUsername(username);
      if (!user) {
        Log.methodFailure(
          this.isValidOsuUsername,
          this.constructor.name,
          `Validation failed for Bancho osu! username ${username}: user not found or user not instanceof Nodesu.User`
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
        osuUser: user
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

      const user: ApiOsuUser = await this.getUserDataForUserId(banchoUserId);

      if (!user) {
        Log.methodFailure(
          this.isValidOsuUserId,
          this.constructor.name,
          `Validation failed for Bancho osu! user ID ${banchoUserId}: user not found or user not instanceof Nodesu.User`
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
        osuUser: user
      };
    } catch (error) {
      Log.methodError(this.isValidOsuUserId, this.constructor.name, error);
      throw error;
    }
  }

  getUserDataForUserId(userId: string): Promise<ApiOsuUser> {
    return this.getUserData({ userId: userId });
  }

  getUserDataForUsername(username: string): Promise<ApiOsuUser> {
    return this.getUserData({ username: username });
  }

  private async getUserData({ userId, username }: { userId?: string; username?: string }): Promise<ApiOsuUser> {
    let user: Nodesu.User;
    if (userId) user = (await this.api.user.get(userId, null, null, Nodesu.LookupType.id)) as Nodesu.User;
    if (username) user = (await this.api.user.get(username, null, null, Nodesu.LookupType.string)) as Nodesu.User;
    // Assume that if the response did not resolve into a Nodesu User object, then it was not a valid user ID.
    // This will only work if { parseData: true } is set in the Nodesu client options.
    if (!user) return null;
    return {
      userId: user.userId,
      username: user.username,
      country: user.country.toString()
    };
  }
}
