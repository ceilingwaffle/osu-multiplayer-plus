import { TYPES } from "../../types";
import getDecorators from "inversify-inject-decorators";
import iocContainer from "../../inversify.config";
const { lazyInject } = getDecorators(iocContainer);
import { TeamService } from "./team.service";
import { RequestDto } from "../../requests/dto";
import { AddTeamsDto } from "./dto/add-team.dto";
import { Response } from "../../requests/Response";
import { AddTeamsReport, TeamInTeamReport } from "./reports/add-teams.report";
import { Log } from "../../utils/Log";
import { Requester } from "../../requests/requesters/requester";
import { RequesterFactory } from "../../requests/requester-factory";
import { RequesterFactoryInitializationError } from "../shared/errors/RequesterFactoryInitializationError";
import { Message, FailureMessage } from "../../utils/message";
import { Team } from "./team.entity";
import { TeamResponseFactory } from "./team-response-factory";

export class TeamController {
  @lazyInject(TYPES.TeamService) private teamService: TeamService;
  @lazyInject(TYPES.RequesterFactory) private requesterFactory: RequesterFactory;

  constructor() {}

  async create(teamsData: { teamDto: AddTeamsDto; requestDto: RequestDto }): Promise<Response<AddTeamsReport>> {
    try {
      const requester = this.requesterFactory.create(teamsData.requestDto);

      // get/create the user adding the team
      const creatorResult = await requester.getOrCreateUser();
      if (creatorResult.failed()) {
        if (creatorResult.value.error) throw creatorResult.value.error;
        Log.methodFailure(this.create, this.constructor.name, creatorResult.value.reason);
        return {
          success: false,
          message: FailureMessage.get("teamCreateFailed"),
          errors: {
            messages: [creatorResult.value.reason],
            validation: creatorResult.value.validationErrors
          }
        };
      }

      const addTeamsResult = await this.teamService.processAddingNewTeams({
        osuUsernamesOrIdsOrSeparators: teamsData.teamDto.osuUsernamesOrIdsOrSeparators,
        userId: creatorResult.value.id
      });
      if (addTeamsResult.failed()) {
        if (addTeamsResult.value.error) throw addTeamsResult.value.error;
        Log.methodFailure(this.create, this.constructor.name, addTeamsResult.value.reason);
        return {
          success: false,
          message: FailureMessage.get("teamCreateFailed"),
          errors: {
            messages: [addTeamsResult.value.reason],
            validation: addTeamsResult.value.validationErrors
          }
        };
      }

      const savedTeams = addTeamsResult.value;

      return {
        success: true,
        message: Message.get("teamCreateSuccess"),
        result: ((): AddTeamsReport => {
          const responseFactory = new TeamResponseFactory(requester, savedTeams, teamsData.requestDto);
          return {
            teams: this.generateTeamsInTeamReportFromTeamEntities(savedTeams),
            addedAgo: responseFactory.getAddedAgoText(),
            addedBy: responseFactory.getAddedBy(),
            addedToGameId: responseFactory.getGameId()
          };
        })()
      };
    } catch (error) {
      Log.methodError(this.create, this.constructor.name, error);
      return {
        success: false,
        message: FailureMessage.get("teamCreateFailed"),
        errors: {
          messages: [error]
        }
      };
    }
  }

  private generateTeamsInTeamReportFromTeamEntities(teamEntities: Team[]) {
    const teamsInReport: TeamInTeamReport[] = [];
    for (const team of teamEntities) {
      teamsInReport.push({ teamId: team.id, teamOsuUsernames: team.users.map(osuUser => osuUser.osuUsername) });
    }
    return teamsInReport;
  }
}
