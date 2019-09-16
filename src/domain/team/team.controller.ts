import { TYPES } from "../../types";
import { TeamService } from "./team.service";
import { RequestDto } from "../../requests/dto";
import { AddTeamsDto } from "./dto/add-team.dto";
import { Response } from "../../requests/Response";
import { AddTeamsReport, TeamInTeamReport } from "./reports/add-teams.report";
import { Log } from "../../utils/Log";
import { RequesterFactory } from "../../requests/requester-factory";
import { Message, FailureMessage } from "../../utils/message";
import { Team } from "./team.entity";
import { TeamResponseFactory } from "./team-response-factory";
import { RequestDtoType } from "../../requests/dto/request.dto";
import { inject, injectable } from "inversify";
import { Helpers } from "../../utils/helpers";
import { tooManyUsersInAddTeamsRequestFailure } from "./team.failure";

@injectable()
export class TeamController {
  constructor(
    @inject(TYPES.RequesterFactory) private requesterFactory: RequesterFactory,
    @inject(TYPES.TeamService) private teamService: TeamService
  ) {
    Log.info(`Initialized ${this.constructor.name}.`);
  }

  async create(teamsData: { teamDto: AddTeamsDto; requestDto: RequestDto }): Promise<Response<AddTeamsReport>> {
    try {
      // validate request
      const { isValid, maxAllowed } = this.isValidAddTeamsRequest({
        osuUsernamesOrIdsOrSeparators: teamsData.teamDto.osuUsernamesOrIdsOrSeparators
      });
      if (!isValid) {
        const failure = tooManyUsersInAddTeamsRequestFailure({ maxAllowed });
        return {
          success: false,
          message: FailureMessage.get("teamCreateFailed"),
          errors: {
            messages: [failure.reason]
          }
        };
      }

      const requester = this.requesterFactory.create(teamsData.requestDto as RequestDtoType);

      // get/create the user adding the team
      const requestingUserResult = await requester.getOrCreateUser();
      if (requestingUserResult.failed()) {
        if (requestingUserResult.value.error) throw requestingUserResult.value.error;
        Log.methodFailure(this.create, this.constructor.name, requestingUserResult.value.reason);
        return {
          success: false,
          message: FailureMessage.get("teamCreateFailed"),
          errors: {
            messages: [requestingUserResult.value.reason],
            validation: requestingUserResult.value.validationErrors
          }
        };
      }
      const requestingUser = requestingUserResult.value;

      const addTeamsResult = await this.teamService.processAddingNewTeams({
        osuUsernamesOrIdsOrSeparators: teamsData.teamDto.osuUsernamesOrIdsOrSeparators,
        requestingUser: requestingUser,
        requestDto: teamsData.requestDto
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
      teamsInReport.push({ teamId: team.id, teamOsuUsernames: team.teamOsuUsers.map(teamOsuUser => teamOsuUser.osuUser.osuUsername) });
    }
    return teamsInReport;
  }

  private isValidAddTeamsRequest({
    osuUsernamesOrIdsOrSeparators
  }: {
    osuUsernamesOrIdsOrSeparators: string[];
  }): { isValid: boolean; maxAllowed: number } {
    // TODO
    const v = Number(process.env.MAX_VARS_ALLOWED_IN_REQUEST);
    if (!v || v < 1) throw new Error("Value for MAX_VARS_ALLOWED_IN_REQUEST in .env is invalid.");
    const maxAllowed = v < 900 ? v : 900;
    let userCount = 0;
    for (const item of osuUsernamesOrIdsOrSeparators) {
      if (!Helpers.isAddTeamCommandSeparator(item)) {
        userCount++;
      }
    }
    const isValid = userCount <= maxAllowed;
    return { isValid, maxAllowed };
  }
}
