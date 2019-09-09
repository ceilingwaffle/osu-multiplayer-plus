import { UserReportProperties } from "../../shared/reports/user-report-properties.type";

export interface UpdateUserReport {
  userId: number;
  updatedBy: UserReportProperties;
  updatedAgo: string;
  targettingGameId?: number;
}
