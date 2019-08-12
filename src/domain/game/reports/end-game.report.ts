import { UserReportProperties } from "../../shared/reports/user-report-properties.type";

export interface EndGameReport {
  gameId: number;
  endedBy: UserReportProperties;
  endedAgo: string;
}
