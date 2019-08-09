import { TeamMode } from "./team-mode";
import { PlayerScore } from "./player-score";
import { MatchEvent } from "./match-event";

export type Match = {
  mapNumber: number;
  multiplayerId: number;
  mapId: number;
  startTime: Date;
  endTime: Date;
  teamMode: TeamMode;
  scores: PlayerScore[];
  ignored?: boolean;
  event: MatchEvent;
};
