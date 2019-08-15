import { UserReportProperties } from "../../shared/reports/user-report-properties.type";

export interface AddLobbyReport {
  addedAgo: string;
  addedBy: UserReportProperties;
  gameId: number;
  multiplayerId: string;
  startAtMapNumber: number;
  status: string;
}
