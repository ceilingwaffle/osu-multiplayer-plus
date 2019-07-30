import { UserReportProperties } from "../../shared/reports/user-report-properties.type";
import { GameMessageTarget } from "../game-message-target";

export interface CreateGameReport {
  teamLives: number;
  countFailedScores: boolean;
  status: string;
  createdBy: UserReportProperties;
  refereedBy: UserReportProperties[];
  messageTargets: GameMessageTarget[];
}
