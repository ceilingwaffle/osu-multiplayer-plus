import { Match } from "./match.entity";
import { ApiMatch } from "../../osu/types/api-match";
import { MatchAborted } from "./match-aborted.entity";
import { Lobby } from "../lobby/lobby.entity";
import { Beatmap } from "../beatmap/beatmap.entity";
import { ApiBeatmap } from "../../osu/types/api-beatmap";

export class MatchService {
  static createMatchFromApiMatch(apiMatch: ApiMatch, lobby: Lobby): Match {
    const match = new Match();

    const matchAborted = this.createMatchAbortedIfApiMatchAborted(apiMatch);
    if (matchAborted) match.matchAbortion = matchAborted;
    // match.beatmapId = apiMatch.mapId.toString();
    match.beatmap = MatchService.createBeatmapFromApiBeatmap(apiMatch.mapId.toString(), apiMatch.beatmap);
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

  private static createBeatmapFromApiBeatmap(beatmapId: string, apiBeatmap: ApiBeatmap): Beatmap {
    // TODO: Replace null values before using this method
    const beatmap = new Beatmap();
    beatmap.beatmapId = beatmapId;
    // beatmap.beatmapSetId = apiBeatmap?.beatmapSetId;
    // beatmap.artist = apiBeatmap?.artist;
    // beatmap.backgroundThumbnailUrlLarge = apiBeatmap?.backgroundThumbnailUrlLarge;
    // beatmap.backgroundThumbnailUrlSmall = apiBeatmap?.backgroundThumbnailUrlSmall;
    // beatmap.beatmapUrl = apiBeatmap?.beatmapUrl;
    // beatmap.diffName = apiBeatmap?.diffName;
    // beatmap.title = apiBeatmap?.title;
    // beatmap.stars = apiBeatmap?.stars;
    return beatmap;
  }
}
