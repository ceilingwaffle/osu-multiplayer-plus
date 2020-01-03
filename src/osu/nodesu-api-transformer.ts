import {
  User as NodesuUser,
  Multi as NodesuMulti,
  MultiTeamTypeType as NodesuMultiTeamTypeType,
  MultiTeamType as NodesuMultiTeamType,
  MultiGame,
  Beatmap
} from "nodesu";
import { Log } from "../utils/log";
import { ApiMultiplayer } from "./types/api-multiplayer";
import { ApiMatch } from "./types/api-match";
import { ApiPlayerScore } from "./types/api-player-score";
import { TeamMode } from "../multiplayer/components/enums/team-mode";
import { ApiMatchEvent } from "./types/api-match-event";
import { ApiOsuUser } from "./types/api-osu-user";
import { ApiBeatmap } from "./types/api-beatmap";

export class NodesuApiTransformer {
  static transformOsuUser(result: NodesuUser): ApiOsuUser {
    return {
      userId: result.userId,
      username: result.username,
      country: result.country.toString()
    };
  }

  /**
   * Transforms a Nodesu Multi object into our own custom type.
   *
   * @param {NodesuMulti} result
   * @returns {ApiMultiplayer}
   */
  static transformMultiplayer(result: NodesuMulti): ApiMultiplayer {
    // Log.info("Converting Nodesu Multi object...");

    if (!result) {
      Log.methodError(this.transformMultiplayer, "Nodesu Multi object was undefined/null. This shouldn't happen.");
      return null;
    }

    let converted: ApiMultiplayer = {
      multiplayerId: result.match.matchId.toString(),
      matches: []
    };

    let mapNumber = 1;
    for (const [index, apiMatch] of result.games.entries()) {
      let matchResult: ApiMatch;
      if (!apiMatch) {
        Log.debug("Skipped empty apiMatch in result.games");
        continue;
      }

      let scores: ApiPlayerScore[] = [];

      for (const apiScore of apiMatch.scores) {
        scores.push({
          osuUserId: apiScore.userId.toString(),
          score: apiScore.score,
          passed: apiScore.pass,
          scoreLetterGrade: "plain_S", // TODO: Calculate score letter grade from score (300's, 100's, etc)
          accuracy: 69.69 // TODO: Calculate accuracy from score
        });
      }

      const nextApiMatch = NodesuApiTransformer.getApiMatchAfterIndex(index, result);
      const isThisMatchAborted = NodesuApiTransformer.isMatchAborted(apiMatch, nextApiMatch);

      matchResult = {
        mapNumber: mapNumber,
        multiplayerId: result.match.matchId.toString(),
        // beatmap: NodesuApiTransformer.transformBeatmap(beatmap), // TODO: Better way to do this?
        mapId: apiMatch.beatmapId.toString(),
        startTime: apiMatch.startTime.getTime(),
        endTime: apiMatch.endTime.getTime(),
        teamMode: NodesuApiTransformer.convertNodesuTeamType(apiMatch.teamType),
        scores: scores,
        event: NodesuApiTransformer.determineMatchEvent(apiMatch.endTime),
        aborted: isThisMatchAborted
      };

      converted.matches.push(matchResult);
      mapNumber++;
    }

    return converted;
  }

  static transformBeatmap(result: Beatmap): ApiBeatmap {
    return {
      beatmapId: result.beatmapId.toString(),
      beatmapSetId: result.beatmapSetId.toString(),
      beatmapUrl: `https://osu.ppy.sh/b/${result.beatmapId}`,
      stars: result.stars,
      title: result.title,
      artist: result.artist,
      diffName: result.difficultyName,
      backgroundThumbnailUrlLarge: `https://b.ppy.sh/thumb/${result.beatmapSetId}l.jpg`,
      backgroundThumbnailUrlSmall: `https://b.ppy.sh/thumb/${result.beatmapSetId}.jpg`
    };
  }

  private static getApiMatchAfterIndex(index: number, result: NodesuMulti): MultiGame {
    // return index + 1 < result.games.length ? result.games[index + 1] : undefined;
    return result.games[index + 1]; // undefined if index out of bounds
  }

  private static isMatchAborted(thisApiMatch: MultiGame, nextApiMatch: MultiGame): boolean {
    /**
     * How to detect an aborted API match:
          thisApiMatch properties:
              endTime: NaN (null)
              event: "match_start"
              scores: [] (empty array)
          nextApiMatch:
              is defined
   */
    return !thisApiMatch.scores.length && !!nextApiMatch;
  }

  static determineMatchEvent(endTime: Date): ApiMatchEvent {
    return isNaN(endTime.getTime()) ? "match_start" : "match_end";
  }

  /**
   * Converts the Nodesu MultiTeamTypeType into our own custom type.
   *
   * @param {NodesuMultiTeamTypeType} teamType
   * @returns {TeamMode}
   */
  private static convertNodesuTeamType(teamType: NodesuMultiTeamTypeType): TeamMode {
    switch (teamType) {
      case NodesuMultiTeamType.headToHead:
        return TeamMode.HeadToHead;
      case NodesuMultiTeamType.tagCoop:
        return TeamMode.TagCoop;
      case NodesuMultiTeamType.tagTeamVs:
        return TeamMode.TagTeamVs;
      case NodesuMultiTeamType.teamVs:
        return TeamMode.TeamVs;
      default:
        throw new Error("Nodesu API team type was not expected.");
    }
  }
}
