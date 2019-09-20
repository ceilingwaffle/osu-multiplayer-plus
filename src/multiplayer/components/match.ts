import { Mods } from "./enums/mods";
import { Beatmap } from "./beatmap";
import { MatchStatus } from "./types/match-status";
import { TeamMode } from "./enums/team-mode";
import { ScoringType } from "./enums/scoring-type";
import { PlayMode } from "./enums/play-mode";

export interface Match {
  startTime: Date;
  endTime: Date;
  playMode: PlayMode;
  scoringType: ScoringType;
  teamType: TeamMode;
  forcedMods: Mods;
  beatmap: Beatmap;
  status: MatchStatus;
}
