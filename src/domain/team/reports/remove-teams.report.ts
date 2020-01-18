import { TeamInTeamReport } from "./add-teams.report";
import { UserReportProperties } from "../../shared/reports/user-report-properties.type";

export class RemoveTeamsReport {
  teams: TeamInTeamReport[];
  removedBy: UserReportProperties;
  removedAgo: string;
  removedFromGameId: number;
}
