import { UserReportProperties } from "../../shared/reports/user-report-properties.type";

export interface RemoveLobbyReport {
  removedAgo: string;
  removedBy: UserReportProperties;
  gameIdRemovedFrom: number;
  multiplayerId: string;
  status: string;
}
