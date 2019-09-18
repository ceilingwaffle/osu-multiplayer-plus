import { UserReportProperties } from "../shared/reports/user-report-properties.type";
import { Team } from "./team.entity";
import { AbstractResponseFactory } from "../shared/abstract-response-factory";
import { Log } from "../../utils/Log";
import { Requester } from "../../requests/requesters/requester";
import { RequestDto } from "../../requests/dto";
import { GameTeam } from "./game-team.entity";

export class TeamResponseFactory extends AbstractResponseFactory<GameTeam[]> {
  constructor(protected readonly requester: Requester, protected readonly subject: GameTeam[], protected readonly requestData: RequestDto) {
    super(requester, subject, requestData);
    if (!this.subject || !this.subject.slice(-1)[0]) {
      Log.warn("No teams in Team Report? This should never happen.");
      return null;
    }
  }

  getAddedBy(): UserReportProperties {
    // TODO: The subject should probably be GameTeam, not Team, since we want info about the team being added to the latest game
    return this.getUserReportPropertiesForUser(this.subject.slice(-1)[0].addedBy);
  }

  getAddedAgoText(): string {
    return this.getTimeAgoTextForTime(this.subject.slice(-1)[0].createdAt);
  }

  getGameId(): number {
    const lastGameTeam = this.subject.slice(-1)[0];
    if (!lastGameTeam || !lastGameTeam.game) {
      throw new Error("Team was not added to any game? This should never happen.");
    }
    return lastGameTeam.game.id;
  }
}
