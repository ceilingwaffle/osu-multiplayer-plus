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
import { GameRepository } from "../game/game.repository";
import { GameTeam } from "./game-team.entity";
import { successPromise } from "../../utils/either";

@injectable()
export class TeamService {
  private readonly osuUserRepository: OsuUserRepository = getCustomRepository(OsuUserRepository);
  private readonly teamRepository: TeamRepository = getCustomRepository(TeamRepository);
  private readonly gameRepository: GameRepository = getCustomRepository(GameRepository);

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
      const targetGameResult = await this.gameService.getRequestingUserTargetGame({
        userId: requestingUser.id
      });
      if (targetGameResult.failed()) {
        Log.methodFailure(this.processAddingNewTeams, this.constructor.name);
        return failurePromise(targetGameResult.value);
      }
      // reload the game with the required relationships
      const game: Game = await this.gameRepository.findOne(
        { id: targetGameResult.value.id },
        {
          relations: [
            "gameTeams",
            "gameTeams.team",
            "gameTeams.team.teamOsuUsers",
            "gameTeams.team.teamOsuUsers.osuUser",
            "gameTeams.team.gameTeams",
            "gameTeams.team.gameTeams.game",
            "gameTeams.team.gameTeams.addedBy",
            "gameTeams.team.gameTeams.addedBy.discordUser",
            "gameTeams.team.gameTeams.addedBy.webUser"
          ]
        }
      );
      game.gameTeams = game.gameTeams.filter(gt => gt.team);

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
      const apiOsuUsersAndTeamSeparators: (ApiOsuUser | String)[] = [];
      for (const item of osuUsernamesOrIdsOrSeparators) {
        if (Helpers.isAddTeamCommandSeparator(item)) {
          apiOsuUsersAndTeamSeparators.push(item);
          continue;
        }
        // TODO: Find solution to potential DoS if a malicious user is trying to add teams too fast.
        // Unfortunately, osu API v1 only supports requesting users one at a time, so we have to fire this multiple times.
        // And since the osu user may have changed their username, and because the add-team request may contain usernames,
        // we need to check these with the osu API (fetching the osu user ids of those usernames)
        // instead of querying our own database for previously-added users.
        const validatedResult: OsuUserValidationResult = await this.userService.isValidBanchoOsuUserIdOrUsername(item);
        if (!validatedResult.isValid) return failurePromise(banchoOsuUserIdIsInvalidFailure(item));
        apiOsuUsersAndTeamSeparators.push(validatedResult.osuUser);
      }

      // ! validate the team structure (e.g. does the game require teams to be of a certain size)

      const teamsOfApiOsuUsers = this.extractApiOsuUserTeamsBetweenSeparators(apiOsuUsersAndTeamSeparators);
      // ensure no osu users have already been added to a team for this game
      const osuUsersInGame = await this.getOsuUsersInGameFromApiUserResults(game, Helpers.flatten2Dto1D<ApiOsuUser>(teamsOfApiOsuUsers));
      if (osuUsersInGame.length) {
        const osuUsernames = osuUsersInGame.map(osuUser => osuUser.osuUsername);
        return failurePromise(osuUsersAlreadyInTeamForThisGameFailure({ osuUsernames, gameId: game.id }));
      }

      // get/create the osu users
      const osuUsers: OsuUser[] = await this.userService.getOrCreateAndSaveOsuUsersFromApiResults(teamsOfApiOsuUsers);
      // get/create the teams (some may have already been added to the game)
      const teams: Team[] = await this.getOrCreateTeamsToBeAddedToGames({ teamsOfApiOsuUsers, osuUsers, requestingUser });
      // filter only teams not already added to this game
      const teamsToBeAdded = teams.filter(t => !game.gameTeams.find(gt => gt.team && gt.team.id === t.id));
      // create the game-teams
      const createdGameTeams: GameTeam[] = this.createGameTeams(game, teamsToBeAdded, requestingUser);
      // add the game-teams to the game
      game.gameTeams = game.gameTeams.concat(createdGameTeams);
      // save the game and game-teams (cascade game->gametenpmams->teams)
      const savedGame = await this.gameRepository.save(game);
      const reloadedGame = await this.gameRepository.findOne(
        { id: savedGame.id },
        {
          relations: [
            "gameTeams",
            "gameTeams.team",
            "gameTeams.team.teamOsuUsers",
            "gameTeams.team.teamOsuUsers.osuUser",
            "gameTeams.team.gameTeams",
            "gameTeams.team.gameTeams.game",
            "gameTeams.team.gameTeams.addedBy",
            "gameTeams.team.gameTeams.addedBy.discordUser",
            "gameTeams.team.gameTeams.addedBy.webUser"
          ]
        }
      );

      const finalTeams: Team[] = reloadedGame.gameTeams.map(gt => gt.team);
      Log.methodSuccess(this.processAddingNewTeams, this.constructor.name);
      return successPromise(finalTeams);
    } catch (error) {
      Log.methodError(this.processAddingNewTeams, this.constructor.name, error);
      throw error;
    }
  }

  private createGameTeams(game: Game, teamsToBeAdded: Team[], creator: User): GameTeam[] {
    let lastGameTeamAdded: GameTeam = this.getLastGameTeamAdded(game);
    let teamNumber = lastGameTeamAdded && lastGameTeamAdded.teamNumber ? lastGameTeamAdded.teamNumber : 0;
    const gameTeams: GameTeam[] = [];
    for (const team of teamsToBeAdded) {
      const gameTeam = new GameTeam();
      gameTeam.game = game;
      gameTeam.team = team;
      gameTeam.addedBy = creator;
      gameTeam.startingLives = game.teamLives;
      gameTeam.currentLives = game.teamLives;
      // assign a color to each game-team using ColorPicker
      this.assignColorToGameTeam(teamNumber, gameTeam);
      gameTeam.teamNumber = ++teamNumber;
      gameTeams.push(gameTeam);
    }
    return gameTeams;
  }

  private assignColorToGameTeam(teamNumber: number, gameTeam: GameTeam) {
    const color = ColorPicker.getNext(teamNumber);
    gameTeam.colorName = color.name;
    gameTeam.colorValue = color.value;
  }

  private getLastGameTeamAdded(game: Game) {
    let lastGameTeamAdded: GameTeam;
    // sort in descending order of ids (order added)
    const s = game.gameTeams.sort((a, b) => b.id - a.id);
    // get the last one if it exists
    if (s.length) lastGameTeamAdded = s[0];
    return lastGameTeamAdded;
  }

  private async getOrCreateTeamsToBeAddedToGames({
    teamsOfApiOsuUsers,
    osuUsers,
    requestingUser
  }: {
    teamsOfApiOsuUsers: ApiOsuUser[][];
    osuUsers: OsuUser[];
    requestingUser: User;
  }): Promise<Team[]> {
    // get any existing teams made up of exactly the same group of users
    let osuBanchoUserIdsGroupedInTeams: number[][] = teamsOfApiOsuUsers.map(t => t.map(u => u.userId));
    const existingTeams: Team[] = await this.teamRepository.findTeamsOfBanchoOsuUserIdGroups(osuBanchoUserIdsGroupedInTeams);
    // create the teams
    let teamsToBeAddedToGame: Team[] = [].concat(existingTeams);
    const unsavedNewTeams: Team[] = this.createTeamsIfNew({
      osuUsers,
      osuBanchoUserIdsGroupedInTeams,
      existingTeams,
      addedBy: requestingUser
    });
    if (unsavedNewTeams.length) {
      const savedNewTeams = await this.teamRepository.save(unsavedNewTeams);
      const reloadedNewTeams = await this.teamRepository.findByIdsWithRelations(savedNewTeams.map(savedTeam => savedTeam.id));
      teamsToBeAddedToGame = teamsToBeAddedToGame.concat(reloadedNewTeams);
    }
    return teamsToBeAddedToGame;
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
    const results = osuUsersInGame.filter(osuUser => apiOsuUsers.find(apiOsuUser => apiOsuUser.userId.toString() === osuUser.osuUserId));
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

  private createTeamsIfNew({
    osuUsers,
    osuBanchoUserIdsGroupedInTeams,
    existingTeams,
    addedBy
  }: {
    osuUsers: OsuUser[];
    osuBanchoUserIdsGroupedInTeams: number[][];
    existingTeams: Team[];
    addedBy: User;
  }): Team[] {
    const createdTeams: Team[] = [];
    for (let i = 0; i < osuBanchoUserIdsGroupedInTeams.length; i++) {
      const userIdGroup = osuBanchoUserIdsGroupedInTeams[i];
      const userIdGroupSorted = userIdGroup.sort((a, b) => Helpers.alphaSort(a.toString(), b.toString()));
      const newTeam = this.createTeamIfNew({
        userIdGroupSorted,
        osuUsers,
        doNotCreateIfInTeams: [].concat(existingTeams, createdTeams),
        addedBy
      });
      if (newTeam) createdTeams.push(newTeam);
    }
    return createdTeams;
  }

  /**
   * Create and add team to unsavedTeams if it doesn't already exist in unsavedTeams.
   *
   * @private
   * @param {number[]} userIdGroupSorted
   * @param {OsuUser[]} osuUsers
   * @param {Team[]} doNotCreateIfInTeams
   * @param {User} addedBy
   */
  private createTeamIfNew({
    userIdGroupSorted,
    osuUsers,
    doNotCreateIfInTeams,
    addedBy
  }: {
    userIdGroupSorted: number[];
    osuUsers: OsuUser[];
    doNotCreateIfInTeams: Team[];
    addedBy: User;
  }) {
    // search for teams matching the user ID group
    let teamFound = false;
    ustLoop: for (const ti of doNotCreateIfInTeams) {
      const thisTeamUidsSorted = ti.teamOsuUsers.map(tou => tou.osuUser.osuUserId).sort(Helpers.alphaSort);
      if (thisTeamUidsSorted.length !== userIdGroupSorted.length) {
        continue ustLoop;
      }
      let idsMatchingThisTeam = 0;
      for (let i = 0; i < thisTeamUidsSorted.length; i++) {
        const teamUid = thisTeamUidsSorted[i];
        const groupUid = userIdGroupSorted[i];
        if (teamUid === groupUid.toString()) {
          idsMatchingThisTeam++;
        }
        if (idsMatchingThisTeam === thisTeamUidsSorted.length) {
          teamFound = true;
          break ustLoop;
        }
      }
    }
    if (!teamFound) {
      const newTeam = this.createTeamFromOsuUsers({ banchoOsuUserIdGroup: userIdGroupSorted, osuUsers, addedBy });
      return newTeam;
    }
  }

  /**
   * Creates and returns a team consisting of OsuUsers matching the bancho osu user ids in banchoOsuUserIdGroup.
   *
   * @private
   * @param {number[]} banchoOsuUserIdGroup
   * @param {OsuUser[]} osuUsers
   * @param {User} addedBy
   * @returns
   */
  private createTeamFromOsuUsers({
    banchoOsuUserIdGroup,
    osuUsers,
    addedBy
  }: {
    banchoOsuUserIdGroup: number[];
    osuUsers: OsuUser[];
    addedBy: User;
  }) {
    const team = new Team();
    for (const userId of banchoOsuUserIdGroup) {
      const teamOsuUser = new TeamOsuUser();
      teamOsuUser.osuUser = osuUsers.find(osuUser => osuUser.osuUserId === userId.toString());
      teamOsuUser.team = team;
      teamOsuUser.addedBy = addedBy;
      if (!teamOsuUser.osuUser) Log.warn(`No OsuUser created for bancho osu user id ${userId}. This should never happen.`);
      if (!team.teamOsuUsers) team.teamOsuUsers = [];
      team.teamOsuUsers.push(teamOsuUser);
    }
    return team;
  }
}
