import { TeamMode } from "../../multiplayer/components/enums/team-mode";
import { ApiPlayerScore } from "./api-player-score";
import { ApiMatchEvent } from "./api-match-event";

export type ApiMatch = {
  /**
   * The order in which the map was played for a given lobby.
   * If the match was aborted, this number should still be the same as if the match were not aborted.
   */
  mapNumber: number;
  multiplayerId: string;
  mapId: string;
  startTime: number;
  endTime: number;
  teamMode: TeamMode;
  event: ApiMatchEvent;
  scores: ApiPlayerScore[];
  aborted?: boolean;
};
