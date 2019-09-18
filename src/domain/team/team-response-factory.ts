import { UserReportProperties } from "../shared/reports/user-report-properties.type";
import { Team } from "./team.entity";
import { AbstractResponseFactory } from "../shared/abstract-response-factory";
import { Log } from "../../utils/Log";
import { Requester } from "../../requests/requesters/requester";
import { RequestDto } from "../../requests/dto";

export class TeamResponseFactory extends AbstractResponseFactory<Team[]> {
  // TODO: Make subject GameTeam instead of Team
  // TODO: replace "Team ID x"  with "Team Number y"
  // TODO: replace command example with -- remove team using !obr removeteam <gameTeamId> (instead of <teamId>)
  // TODO: add command !listteams <gameId> -- returns team numbers for user's targetted game

  constructor(protected readonly requester: Requester, protected readonly subject: Team[], protected readonly requestData: RequestDto) {
    super(requester, subject, requestData);
    if (!this.subject[0]) {
      Log.warn("No teams in Team Report?");
      return null;
    }
  }

  getAddedBy(): UserReportProperties {
    // TODO: The subject should probably be GameTeam, not Team, since we want info about the team being added to the latest game
    return this.getUserReportPropertiesForUser(this.subject[0].gameTeams[0].addedBy);
  }

  getAddedAgoText(): string {
    return this.getTimeAgoTextForTime(this.subject[0].gameTeams[0].createdAt);
  }

  getGameId(): number {
    const lastGameTeam = this.subject[0].gameTeams.slice(-1)[0];
    if (!lastGameTeam || !lastGameTeam.game) {
      throw new Error("Team was not added to any game? This should never happen.");
    }
    return lastGameTeam.game.id;
  }
}
