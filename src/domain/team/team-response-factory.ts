import { UserReportProperties } from "../shared/reports/user-report-properties.type";
import { Team } from "./team.entity";
import { AbstractResponseFactory } from "../shared/abstract-response-factory";
import { Log } from "../../utils/Log";
import { Requester } from "../../requests/requesters/requester";
import { RequestDto } from "../../requests/dto";

export class TeamResponseFactory extends AbstractResponseFactory<Team[]> {
  constructor(protected readonly requester: Requester, protected readonly subject: Team[], protected readonly requestData: RequestDto) {
    super(requester, subject, requestData);
    if (!this.subject[0]) {
      Log.warn("No teams in Team Report?");
      return null;
    }
  }

  getAddedBy(): UserReportProperties {
    return this.getUserReportPropertiesForUser(this.subject[0].createdBy);
  }

  getAddedAgoText(): string {
    return this.getTimeAgoTextForTime(this.subject[0].createdAt);
  }

  getGameId(): number {
    if (!this.subject[0].gameTeams[0] || !this.subject[0].gameTeams[0].game) {
      throw new Error("Team was not added to any game? This should never happen.");
    }
    return this.subject[0].gameTeams[0].game.id;
  }
}
