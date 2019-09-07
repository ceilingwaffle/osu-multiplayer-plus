import { UserReportProperties } from "../../shared/reports/user-report-properties.type";

export class AddTeamReport {
  teamId: number;
  gameId: number;
  teamOsuUsernames: string[];
  addedBy: UserReportProperties;
  addedAgo: string;
}
