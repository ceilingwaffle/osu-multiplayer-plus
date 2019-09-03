import { Multi as NodesuMulti, MultiTeamTypeType as NodesuMultiTeamTypeType, MultiTeamType as NodesuMultiTeamType } from "nodesu";
import { Log } from "../utils/Log";
import { Multiplayer } from "./types/multiplayer";
import { Match } from "./types/match";
import { PlayerScore } from "./types/player-score";
import { TeamMode } from "./types/team-mode";
import { MatchEvent } from "./types/match-event";

export class NodesuApiTransformer {
  /**
   * Transforms a Nodesu Multi object into our own custom type.
   *
   * @param {NodesuMulti} result
   * @returns {Multiplayer}
   */
  static transformMultiplayer(result: NodesuMulti): Multiplayer {
    // Log.info("Converting Nodesu Multi object...");

    if (!result) {
      Log.methodError(this.transformMultiplayer, "Nodesu Multi object was undefined/null. This shouldn't happen.");
      return null;
    }

    let converted: Multiplayer = {
      multiplayerId: result.match.matchId,
      matches: []
    };

    let mapNumber = 1;
    for (const apiMatch of result.games) {
      let matchResult: Match;
      if (!apiMatch) {
        Log.debug("Skipped empty apiMatch in result.games");
        continue;
      }

      let scores: PlayerScore[] = [];

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

  static determineMatchEvent(endTime: Date): MatchEvent {
    return isNaN(endTime.getTime()) ? MatchEvent.MATCH_START : MatchEvent.MATCH_END;
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
