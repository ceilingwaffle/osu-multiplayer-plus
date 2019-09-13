import { Either, failurePromise } from "../../utils/Either";
import { Failure } from "../../utils/Failure";
import { OsuUserFailure, banchoOsuUserIdIsInvalidFailure } from "../user/user.failure";
import { GameFailure } from "../game/game.failure";
import { TeamFailure, osuUsersAlreadyInTeamForThisGameFailure } from "./team.failure";
import { Team } from "./team.entity";
import { PermissionsFailure } from "../../permissions/permissions.failure";
import { injectable, inject } from "inversify";
import TYPES from "../../types";
import { UserService } from "../user/user.service";
import { GameService } from "../game/game.service";
import { Permissions } from "../../permissions/permissions";
import { Log } from "../../utils/Log";
import { ColorPicker } from "../../utils/color-picker";
import { User } from "../user/user.entity";
import { RequestDto } from "../../requests/dto/request.dto";
import { Helpers } from "../../utils/helpers";
import { OsuUserValidationResult } from "../../osu/types/osu-user-validation-result";
import { ApiOsuUser } from "../../osu/types/api-osu-user";
import { OsuUser } from "../user/osu-user.entity";
import { Game } from "../game/game.entity";
import { OsuUserRepository } from "../user/osu-user.repository";
import { getCustomRepository } from "typeorm";
import { TeamOsuUser } from "./team-osu-user.entity";
import { TeamRepository } from "./team.repository";

@injectable()
export class TeamService {
  private readonly osuUserRepository: OsuUserRepository = getCustomRepository(OsuUserRepository);
  private readonly teamRepository: TeamRepository = getCustomRepository(TeamRepository);

  constructor(
    @inject(TYPES.UserService) protected userService: UserService,
    @inject(TYPES.GameService) protected gameService: GameService,
    @inject(TYPES.Permissions) protected permissions: Permissions
  ) {
    Log.debug(`Initialized ${this.constructor.name}`);
  }

  /**
   * Attempts to add a new team to a game after creating all osu user entities that make up the teams.
   *
   * @param {{
   *     osuUsernamesOrIdsOrSeparators: string[];
   *     userId: number;
   *   }} {
   *     osuUsernamesOrIdsOrSeparators,
   *     userId
   *   }
   * @returns {(Promise<Either<Failure<TeamFailure | OsuUserFailure | GameFailure>, Lobby>>)}
   */
  async processAddingNewTeams({
    osuUsernamesOrIdsOrSeparators,
    requestingUser,
    requestDto
  }: {
    osuUsernamesOrIdsOrSeparators: string[];
    requestingUser: User;
    requestDto: RequestDto;
  }): Promise<Either<Failure<TeamFailure | OsuUserFailure | GameFailure | PermissionsFailure>, Team[]>> {
    try {
      // find the user's most recent game created, or !targetgame
      const targetGameResult = await this.gameService.getRequestingUserTargetGame({ userId: requestingUser.id });
      if (targetGameResult.failed()) {
        Log.methodFailure(this.processAddingNewTeams, this.constructor.name);
        return failurePromise(targetGameResult.value);
      }
      const game: Game = targetGameResult.value;

      // ensure the requesting-user has permission to add a team to the target game
      const userRole = await this.gameService.getUserRoleForGame(requestingUser.id, game.id);
      const userPermittedResult = await this.permissions.checkUserPermission({
        user: requestingUser,
        userRole: userRole,
        action: "addteam",
        resource: "game",
        entityId: game.id,
        requesterClientType: requestDto.commType
      });
      if (userPermittedResult.failed()) {
        Log.methodFailure(
          this.processAddingNewTeams,
          this.constructor.name,
          `User ${requestingUser.id} does not have permission to add a team to game ${game.id}.`
        );
        return failurePromise(userPermittedResult.value);
      }

      // validate the osu usernames with bancho
      const apiOsuUsers: (ApiOsuUser | String)[] = [];
      for (const item of osuUsernamesOrIdsOrSeparators) {
        if (Helpers.isAddTeamCommandSeparator(item)) {
          apiOsuUsers.push(item);
          continue;
        }
        // TODO: Find solution to potential DoS if a malicious user is trying to add teams too fast.
        // Unfortunately, osu API v1 only supports requesting users one at a time, so we have to fire this multiple times.
        // And since the osu user may have changed their username, and because the add-team request may contain usernames,
        // we need to check these with the osu API (fetching the osu user ids of those usernames)
        // instead of querying our own database for previously-added users.
        const valid: OsuUserValidationResult = await this.userService.isValidBanchoOsuUserIdOrUsername(item);
        if (!valid) return failurePromise(banchoOsuUserIdIsInvalidFailure(item));
        apiOsuUsers.push(valid.osuUser);
      }

      // ! validate the team structure (e.g. does the game require teams to be of a certain size)

      const teamsOfApiOsuUsers = this.extractApiOsuUserTeamsBetweenSeparators(apiOsuUsers);
      // ensure no osu users have already been added to a team for this game
      const osuUsersInGame = await this.getOsuUsersInGameFromApiUserResults(game, Helpers.flatten2Dto1D<ApiOsuUser>(teamsOfApiOsuUsers));
      if (osuUsersInGame.length) {
        const osuUsernames = osuUsersInGame.map(osuUser => osuUser.osuUsername);
        return failurePromise(osuUsersAlreadyInTeamForThisGameFailure({ osuUsernames, gameId: game.id }));
      }

      // get/create the osu users
      const osuUsers: OsuUser[] = await this.userService.getOrCreateAndSaveOsuUsersFromApiResults(teamsOfApiOsuUsers);

      // create the teams
      const osuBanchoUserIdsGroupedInTeams: number[][] = teamsOfApiOsuUsers.map(t => t.map(u => u.userId));
      const unsavedTeams: Team[] = this.createTeams(osuUsers, osuBanchoUserIdsGroupedInTeams);
      // save the teams
      const savedTeams = await this.teamRepository.save(unsavedTeams);
      // reload the teams
      const reloadedTeams = await this.teamRepository.findByIds(savedTeams.map(savedTeam => savedTeam.id), {
        // relations: ["teamOsuUsers", "gameTeams"]
      });

      // add the teams to the game
      //    assign a color to the team using ColorPicker

      throw new Error("TODO: Implement method of TeamService.");
    } catch (error) {
      Log.methodError(this.processAddingNewTeams, this.constructor.name, error);
      throw error;
    }
  }

  private createTeams(osuUsers: OsuUser[], osuBanchoUserIdsGroupedInTeams: number[][]): Team[] {
    const unsavedTeams: Team[] = [];
    for (const userIdGroup of osuBanchoUserIdsGroupedInTeams) {
      const team = new Team();
      for (const userId of userIdGroup) {
        const teamOsuUser = new TeamOsuUser();
        teamOsuUser.osuUser = osuUsers.find(osuUser => osuUser.osuUserId === userId.toString());
        if (!teamOsuUser.osuUser) Log.warn(`No OsuUser created for bancho osu user id ${userId}. This should never happen.`);
        if (!team.teamOsuUsers) team.teamOsuUsers = [];
        team.teamOsuUsers.push(teamOsuUser);
      }
      unsavedTeams.push(team);
    }
    return unsavedTeams;
  }

  /**
   * Returns a list of OsuUsers in the list of API Osu Users added to a team in the given game.
   *
   * @private
   * @param {Game} game
   * @param {ApiOsuUser[]} apiOsuUsers
   * @returns {Promise<OsuUser[]>}
   */
  private async getOsuUsersInGameFromApiUserResults(game: Game, apiOsuUsers: ApiOsuUser[]): Promise<OsuUser[]> {
    const osuUsersInGame = await this.osuUserRepository.findOsuUsersInGame(game.id);
    // compare by Bancho osu user ID
    const results = osuUsersInGame.filter(osuUser => apiOsuUsers.filter(apiOsuUser => apiOsuUser.userId.toString() === osuUser.osuUserId));
    return results;
  }

  /**
   * e.g. [a,b,|,c,d,|,e,f] --> [[a,b],[c,d],[e,f]]
   *
   * @private
   * @param {(ApiOsuUser | String)[]} from
   * @returns {ApiOsuUser[][]}
   */
  private extractApiOsuUserTeamsBetweenSeparators(from: (ApiOsuUser | String)[]): ApiOsuUser[][] {
    // TODO: unit test
    const separators: string[] = ["|"];
    const groups: ApiOsuUser[][] = [];
    var i = from.length;
    const copy = from.slice();
    copy.push(separators[0]); // somewhat hacky solution to just add a separator to the beginning to make this work
    const items = copy.reverse();
    while (i--) {
      const item = items[i];
      if ((typeof item === "string" && separators.includes(item)) || i === 0) {
        const team = items.splice(i + 1, items.length - 1 - i).reverse() as ApiOsuUser[];
        groups.push(team);
        items.splice(i, 1);
      }
    }
    return groups;
  }
}
