import { TeamMode } from "./team-mode";
import { PlayerScore } from "./player-score";

export type Match = {
  mapNumber: number;
  multiplayerId: number;
  mapId: number;
  startTime: Date;
  endTime: Date;
  teamMode: TeamMode;
  scores: PlayerScore[];
  ignored?: boolean;
};
