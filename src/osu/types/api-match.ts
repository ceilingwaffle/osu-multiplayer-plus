import { TeamMode } from "../../multiplayer/components/enums/team-mode";
import { ApiPlayerScore } from "./api-player-score";
import { ApiMatchEvent } from "./api-match-event";

export type ApiMatch = {
  mapNumber: number;
  multiplayerId: number;
  mapId: number;
  startTime: Date;
  endTime: Date;
  teamMode: TeamMode;
  event: ApiMatchEvent;
  scores: ApiPlayerScore[];
};
