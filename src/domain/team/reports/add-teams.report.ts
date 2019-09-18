import { UserReportProperties } from "../../shared/reports/user-report-properties.type";

export class AddTeamsReport {
  teams: TeamInTeamReport[];
  addedBy: UserReportProperties;
  addedAgo: string;
  addedToGameId: number;
}

export interface TeamInTeamReport {
  teamId: number;
  teamNumber: number;
  teamColorName: string;
  teamColorValue: string;
  teamOsuUsernames: string[];
}
