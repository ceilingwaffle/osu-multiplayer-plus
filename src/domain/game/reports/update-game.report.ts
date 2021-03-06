import { UserReportProperties } from "../../shared/reports/user-report-properties.type";
import { GameMessageTarget } from "../game-message-target";

export interface UpdateGameReport {
  gameId: number;
  teamLives: number;
  countFailedScores: boolean;
  status: string;
  createdBy: UserReportProperties;
  createdAgo: string;
  refereedBy: UserReportProperties[];
  messageTargets: GameMessageTarget[];
}
