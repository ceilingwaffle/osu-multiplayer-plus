import { UserReportProperties } from "../../shared/reports/user-report-properties.type";

export interface StartGameReport {
  gameId: number;
  startedBy: UserReportProperties;
  startedAgo: string;
}
