import { Multi as NodesuMulti, MultiTeamTypeType as NodesuMultiTeamTypeType, MultiTeamType as NodesuMultiTeamType } from "nodesu";
import { Log } from "../utils/Log";
import { ApiMultiplayer } from "./types/api-multiplayer";
import { ApiMatch } from "./types/api-match";
import { ApiPlayerScore } from "./types/api-player-score";
import { ApiTeamMode } from "./types/api-team-mode";
import { ApiMatchEvent } from "./types/api-match-event";

export class NodesuApiTransformer {
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
    for (const apiMatch of result.games) {
      let matchResult: ApiMatch;
      if (!apiMatch) {
        Log.debug("Skipped empty apiMatch in result.games");
        continue;
      }

      let scores: ApiPlayerScore[] = [];

      for (const apiScore of apiMatch.scores) {
        scores.push({
          osuUserId: apiScore.userId,
          score: apiScore.score,
          passed: apiScore.pass
        });
      }

      // TODO: determine isAborted=T/F based on endTime-startTime relative to map length

      matchResult = {
        mapNumber: mapNumber,
        multiplayerId: result.match.matchId,
        mapId: apiMatch.beatmapId,
        startTime: apiMatch.startTime,
        endTime: apiMatch.endTime,
        teamMode: NodesuApiTransformer.convertNodesuTeamType(apiMatch.teamType),
        scores: scores,
        event: NodesuApiTransformer.determineMatchEvent(apiMatch.endTime)
      };

      converted.matches.push(matchResult);
      mapNumber++;
    }

    return converted;
  }

  static determineMatchEvent(endTime: Date): ApiMatchEvent {
    return isNaN(endTime.getTime()) ? "match_start" : "match_end";
  }

  /**
   * Converts the Nodesu MultiTeamTypeType into our own custom type.
   *
   * @param {NodesuMultiTeamTypeType} teamType
   * @returns {ApiTeamMode}
   */
  private static convertNodesuTeamType(teamType: NodesuMultiTeamTypeType): ApiTeamMode {
    switch (teamType) {
      case NodesuMultiTeamType.headToHead:
        return ApiTeamMode.HeadToHead;
      case NodesuMultiTeamType.tagCoop:
        return ApiTeamMode.TagCoop;
      case NodesuMultiTeamType.tagTeamVs:
        return ApiTeamMode.TagTeamVs;
      case NodesuMultiTeamType.teamVs:
        return ApiTeamMode.TeamVs;
      default:
        throw new Error("Nodesu API team type was not expected.");
    }
  }
}
