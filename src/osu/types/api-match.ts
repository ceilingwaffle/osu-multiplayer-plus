import { ApiTeamMode } from "./api-team-mode";
import { ApiPlayerScore } from "./api-player-score";
import { ApiMatchEvent } from "./api-match-event";

export type ApiMatch = {
  mapNumber: number;
  multiplayerId: number;
  mapId: number;
  startTime: Date;
  endTime: Date;
  teamMode: ApiTeamMode;
  scores: ApiPlayerScore[];
  ignored?: boolean;
  event: ApiMatchEvent;
};
