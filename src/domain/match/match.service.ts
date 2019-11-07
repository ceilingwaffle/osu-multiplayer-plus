import { Match } from "./match.entity";
import { ApiMatch } from "../../osu/types/api-match";
import { MatchAborted } from "./match-aborted.entity";
import { Lobby } from "../lobby/lobby.entity";

export class MatchService {
  static createMatchFromApiMatch(apiMatch: ApiMatch, lobby: Lobby): Match {
    const match = new Match();
    const matchAborted = this.createMatchAbortedIfApiMatchAborted(apiMatch);
    if (matchAborted) match.matchAbortion = matchAborted;
    match.beatmapId = apiMatch.mapId.toString();
    match.endTime = isNaN(apiMatch.endTime) ? null : apiMatch.endTime;
    match.ignored = false; // TODO
    match.lobby = lobby;
    match.mapNumber = apiMatch.mapNumber;
    match.playerScores = [];
    match.startTime = isNaN(apiMatch.startTime) ? null : apiMatch.startTime;
    match.teamMode = apiMatch.teamMode;
    return match;
  }

  static createMatchAbortedIfApiMatchAborted(apiMatch: ApiMatch): MatchAborted {
    let matchAborted: MatchAborted;
    if (apiMatch.aborted) {
      matchAborted = new MatchAborted();
      matchAborted.isAborted = true;
    }
    return matchAborted;
  }
}
