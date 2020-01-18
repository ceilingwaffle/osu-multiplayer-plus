import { TYPES } from "../../types";
import { TeamService } from "./team.service";
import { RequestDto } from "../../requests/dto";
import { AddTeamsDto } from "./dto/add-team.dto";
import { Response } from "../../requests/response";
import { AddTeamsReport, TeamInTeamReport } from "./reports/add-teams.report";
import { Log } from "../../utils/log";
import { RequesterFactory } from "../../requests/requester-factory";
import { Message, FailureMessage } from "../../utils/message";
import { Team } from "./team.entity";
import { TeamResponseFactory } from "./team-response-factory";
import { RequestDtoType } from "../../requests/dto/request.dto";
import { inject, injectable } from "inversify";
import { Helpers } from "../../utils/helpers";
import {
  tooManyUsersInAddTeamsRequestFailure,
  TeamFailure,
  samePlayerExistsInMultipleTeamsInAddTeamsRequestFailure,
  invalidTeamNumbersInRemoveTeamsRequestFailure
} from "./team.failure";
import { ApiOsuUser } from "../../osu/types/api-osu-user";
import { Failure } from "../../utils/failure";
import { Either, failurePromise, failure, success } from "../../utils/either";
import { GameTeam } from "./game-team.entity";
import { RemoveTeamsDto } from "./dto/remove-team.dto";
import { RemoveTeamsReport } from "./reports/remove-teams.report";
import { constants } from "../../constants";

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
      const validationOutcome = this.isValidAddTeamsRequest(teamsData);
      if (validationOutcome.failed()) {
        return {
          success: false,
          message: FailureMessage.get("teamCreateFailed"),
          errors: {
            messages: [validationOutcome.value.reason]
          }
        };
      }

      // get/create the user adding the team
      const requester = this.requesterFactory.create(teamsData.requestDto as RequestDtoType);
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

      const savedTeams: GameTeam[] = addTeamsResult.value;

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

  async remove(teamsData: { teamDto: RemoveTeamsDto; requestDto: RequestDto }): Promise<Response<RemoveTeamsReport>> {
    try {
      // validate request
      const validationOutcome = this.isValidRemoveTeamsRequest(teamsData);
      if (validationOutcome.failed()) {
        return {
          success: false,
          message: FailureMessage.get("teamRemoveFailed"),
          errors: {
            messages: [validationOutcome.value.reason]
          }
        };
      }

      // get/create the user adding the team
      const requester = this.requesterFactory.create(teamsData.requestDto as RequestDtoType);
      const requestingUserResult = await requester.getOrCreateUser();
      if (requestingUserResult.failed()) {
        if (requestingUserResult.value.error) throw requestingUserResult.value.error;
        Log.methodFailure(this.remove, this.constructor.name, requestingUserResult.value.reason);
        return {
          success: false,
          message: FailureMessage.get("teamRemoveFailed"),
          errors: {
            messages: [requestingUserResult.value.reason],
            validation: requestingUserResult.value.validationErrors
          }
        };
      }
      const requestingUser = requestingUserResult.value;

      const removeTeamsResult = await this.teamService.processRemovingTeams({
        removeTeamNumbers: teamsData.teamDto,
        requestingUser: requestingUser,
        requestDto: teamsData.requestDto
      });

      throw new Error("TODO: Implement method of TeamController.");
    } catch (error) {
      Log.methodError(this.create, this.constructor.name, error);
      return {
        success: false,
        message: FailureMessage.get("teamRemoveFailed"),
        errors: {
          messages: [error]
        }
      };
    }
  }

  private generateTeamsInTeamReportFromTeamEntities(teamEntities: GameTeam[]) {
    const teamsInReport: TeamInTeamReport[] = [];
    for (const gameTeam of teamEntities) {
      teamsInReport.push({
        teamId: gameTeam.team.id,
        teamColorName: gameTeam.colorName,
        teamColorValue: gameTeam.colorValue,
        teamNumber: gameTeam.teamNumber,
        teamOsuUsernames: gameTeam.team.teamOsuUsers.map(teamOsuUser => teamOsuUser.osuUser.osuUsername)
      });
    }
    return teamsInReport;
  }

  private isValidAddTeamsRequest(teamsData: { teamDto: AddTeamsDto; requestDto: RequestDto }): Either<Failure<TeamFailure>, null> {
    // TODO: Can we extract this out to some validator class, so we don't need to reference Either in a controller class. Also some kind of pipeline pattern or chain of repsonsiblity, or just use some existing library for this?
    const { isValidMaxVarsAllowed, maxAllowed } = this.isValidMaxVarsAllowed({
      osuUsernamesOrIdsOrSeparators: teamsData.teamDto.osuUsernamesOrIdsOrSeparators
    });
    if (!isValidMaxVarsAllowed) {
      return failure(tooManyUsersInAddTeamsRequestFailure({ maxAllowed }));
    }
    const { isValidNoDuplicatePlayersInTeams, problemItems } = this.isValidNoDuplicatePlayersInTeams({
      osuUsernamesOrIdsOrSeparators: teamsData.teamDto.osuUsernamesOrIdsOrSeparators
    });
    if (!isValidNoDuplicatePlayersInTeams) {
      return failure(samePlayerExistsInMultipleTeamsInAddTeamsRequestFailure({ problemItems }));
    }
    return success(null);
  }

  private isValidRemoveTeamsRequest(teamsData: { teamDto: RemoveTeamsDto; requestDto: RequestDto }): Either<Failure<TeamFailure>, null> {
    if (!teamsData.teamDto.teamNumbers || !teamsData.teamDto.teamNumbers.length) {
      return failure(invalidTeamNumbersInRemoveTeamsRequestFailure({ teamNumbers: [] }));
    }
    const invalidTeamNumbers: number[] = [];
    for (const teamNumber of teamsData.teamDto.teamNumbers) {
      if (teamNumber < constants.MIN_ENTITY_ID_NUMBER || !Number.isInteger(teamNumber)) {
        invalidTeamNumbers.push(teamNumber);
      }
    }
    if (invalidTeamNumbers.length) {
      return failure(invalidTeamNumbersInRemoveTeamsRequestFailure({ teamNumbers: invalidTeamNumbers }));
    }
    return success(null);
  }

  private isValidMaxVarsAllowed({
    osuUsernamesOrIdsOrSeparators
  }: {
    osuUsernamesOrIdsOrSeparators: string[];
  }): { isValidMaxVarsAllowed: boolean; maxAllowed: number } {
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
    const isValidMaxVarsAllowed = userCount <= maxAllowed;
    return { isValidMaxVarsAllowed, maxAllowed };
  }

  private isValidNoDuplicatePlayersInTeams({
    osuUsernamesOrIdsOrSeparators
  }: {
    osuUsernamesOrIdsOrSeparators: string[];
  }): { isValidNoDuplicatePlayersInTeams: boolean; problemItems: string[] } {
    // TODO - rewrite without using extractApiOsuUserTeamsBetweenSeparators to avoid casting to unknown[][]
    const groups: string[][] = (Helpers.extractApiOsuUserTeamsBetweenSeparators(osuUsernamesOrIdsOrSeparators) as unknown[][]) as string[][]; // prettier-ignore
    // [["a", "b"], ["a", "c"]] -> ["a": 2, "b": 1, "c": 1]
    const players = new Array<string>();
    groups.forEach(g => g.forEach(p => players.push(p)));
    const playerCounts = {};
    players.forEach(p => (Object.keys(playerCounts).includes(p) ? playerCounts[p]++ : (playerCounts[p] = 1)));
    const problemItems = Object.keys(playerCounts).filter(p => playerCounts[p] > 1);
    return {
      isValidNoDuplicatePlayersInTeams: !problemItems.length,
      problemItems: problemItems
    };
  }
}
