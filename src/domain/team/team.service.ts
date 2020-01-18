import { Either, failurePromise } from "../../utils/either";
import { Failure } from "../../utils/failure";
import { OsuUserFailure, banchoOsuUserIdIsInvalidFailure } from "../user/user.failure";
import { GameFailure } from "../game/game.failure";
import { TeamFailure, osuUsersAlreadyInTeamForThisGameFailure, teamNumbersDoNotExistInGame } from "./team.failure";
import { Team } from "./team.entity";
import { PermissionsFailure } from "../../permissions/permissions.failure";
import { injectable, inject } from "inversify";
import TYPES from "../../types";
import { UserService } from "../user/user.service";
import { GameService } from "../game/game.service";
import { Permissions } from "../../permissions/permissions";
import { Log } from "../../utils/log";
import { ColorPicker } from "../../utils/color-picker";
import { User } from "../user/user.entity";
import { RequestDto } from "../../requests/dto/request.dto";
import { Helpers } from "../../utils/helpers";
import { OsuUserValidationResult } from "../../osu/types/osu-user-validation-result";
import { ApiOsuUser } from "../../osu/types/api-osu-user";
import { OsuUser } from "../user/osu-user.entity";
import { Game } from "../game/game.entity";
import { OsuUserRepository } from "../user/osu-user.repository";
import { getCustomRepository, Connection } from "typeorm";
import { TeamOsuUser } from "./team-osu-user.entity";
import { TeamRepository } from "./team.repository";
import { GameRepository } from "../game/game.repository";
import { GameTeam } from "./game-team.entity";
import { successPromise } from "../../utils/either";
import { TeamOsuUserRepository } from "./team-osu-user.repository";
import { IDbClient } from "../../database/db-client";
import _ = require("lodash"); // do not convert to default import -- it will break!!

@injectable()
export class TeamService {
  // private readonly osuUserRepository: OsuUserRepository = getCustomRepository(OsuUserRepository);
  // private readonly teamRepository: TeamRepository = getCustomRepository(TeamRepository);
  // private readonly teamOsuUserRepository: TeamOsuUserRepository = getCustomRepository(TeamOsuUserRepository);
  // private readonly gameRepository: GameRepository = getCustomRepository(GameRepository);

  protected dbConn: Connection = this.dbClient.getConnection();

  constructor(
    @inject(TYPES.IDbClient) protected dbClient: IDbClient,
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
  }): Promise<Either<Failure<TeamFailure | OsuUserFailure | GameFailure | PermissionsFailure>, GameTeam[]>> {
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
      const game = await this.gameService.loadGameForTeamRequest(targetGameResult.value.id);
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

      const teamsOfApiOsuUsers = Helpers.extractApiOsuUserTeamsBetweenSeparators(apiOsuUsersAndTeamSeparators);
      // ensure no osu users have already been added to a team for this game
      const osuUsersInGame = await this.getOsuUsersInGameFromApiUserResults(game, Helpers.flatten2Dto1D<ApiOsuUser>(teamsOfApiOsuUsers));
      if (osuUsersInGame.length) {
        const osuUsernames = osuUsersInGame.map(osuUser => osuUser.osuUsername);
        return failurePromise(osuUsersAlreadyInTeamForThisGameFailure({ osuUsernames, gameId: game.id }));
      }

      // get/create the osu users
      const osuUsers: OsuUser[] = await this.userService.getOrCreateAndSaveOsuUsersFromApiResults(teamsOfApiOsuUsers);
      // get/create/save the naked teams (no relations) (some may have already been added to the game)
      const teams: Team[] = await this.getOrCreateAndSaveTeams({ teamsOfApiOsuUsers, osuUsers, requestingUser });
      // filter only teams not already added to this game
      const teamsToBeAdded: Team[] = teams.filter(t => !game.gameTeams.find(gt => gt.team && gt.team.id === t.id));
      // create the game-teams
      const createdGameTeams: GameTeam[] = this.createGameTeams(game, teamsToBeAdded, requestingUser);
      // add the game-teams to the game
      game.gameTeams = game.gameTeams.concat(createdGameTeams);
      // save the game and game-teams
      // TODO: Optimize - chunk save the game teams
      for (const gt of game.gameTeams) {
        await gt.save();
      }
      const savedGame = await this.dbConn.manager.getCustomRepository(GameRepository).save(game);
      const reloadedGame = await this.gameService.loadGameForTeamRequest(savedGame.id);
      const finalTeamsAdded: GameTeam[] = reloadedGame.gameTeams.filter(
        ggt =>
          createdGameTeams.map(cgt => cgt.team.id).includes(ggt.team.id) && createdGameTeams.map(cgt => cgt.game.id).includes(ggt.game.id)
      );

      Log.methodSuccess(this.processAddingNewTeams, this.constructor.name);
      return successPromise(finalTeamsAdded);
    } catch (error) {
      Log.methodError(this.processAddingNewTeams, this.constructor.name, error);
      throw error;
    }
  }

  async processRemovingTeams({
    removeTeamNumbers,
    requestingUser,
    requestDto
  }: {
    removeTeamNumbers: number[];
    requestingUser: User;
    requestDto: RequestDto;
  }): Promise<Either<Failure<TeamFailure | GameFailure | PermissionsFailure>, GameTeam[]>> {
    try {
      // find the user's most recent game created, or !targetgame
      const targetGameResult = await this.gameService.getRequestingUserTargetGame({
        userId: requestingUser.id
      });
      if (targetGameResult.failed()) {
        Log.methodFailure(this.processRemovingTeams, this.constructor.name);
        return failurePromise(targetGameResult.value);
      }
      // reload the game with the required relationships
      const targetGame = await this.gameService.loadGameForTeamRequest(targetGameResult.value.id);

      // ensure the requesting-user has permission to remove a team from the target game
      const userRole = await this.gameService.getUserRoleForGame(requestingUser.id, targetGame.id);
      const userPermittedResult = await this.permissions.checkUserPermission({
        user: requestingUser,
        userRole: userRole,
        action: "removeteam",
        resource: "game",
        entityId: targetGame.id,
        requesterClientType: requestDto.commType
      });
      if (userPermittedResult.failed()) {
        Log.methodFailure(
          this.processRemovingTeams,
          this.constructor.name,
          `User ${requestingUser.id} does not have permission to remove a team from game ${targetGame.id}.`
        );
        return failurePromise(userPermittedResult.value);
      }

      // validate the team numbers exist for teams in the game
      const gameTeams = targetGame.gameTeams.filter(gt => gt.teamNumber);
      const nonExistentTeamNumbers = removeTeamNumbers.filter(tn => !gameTeams.find(gt => gt.teamNumber == tn));
      if (gameTeams.length != removeTeamNumbers.length) {
        Log.methodFailure(this.processRemovingTeams, this.constructor.name, "Team number validation failed.");
        return failurePromise(teamNumbersDoNotExistInGame({ teamNumbers: nonExistentTeamNumbers, gameId: targetGame.id }));
      }
      // remove the teams
      const gameTeamIdsToBeRemoved = targetGame.gameTeams.filter(gt => gt.teamNumber).map(gt => gt.id);
      const removedGameTeams: GameTeam[] = await this.removeGameTeamsFromGame({ gameTeamIdsToBeRemoved, targetGame });

      // shuffle the team-numbers below up to remove any team-number gaps
      const rearrangedGameTeams: GameTeam[] = await this.removeTeamNumberGapsFromGameTeams({ gameTeams: removedGameTeams });

      // return the updated list of team numbers and their player names
      return rearrangedGameTeams;

      throw new Error("TODO: Implement method of TeamService.");
    } catch (error) {
      Log.methodError(this.processRemovingTeams, this.constructor.name, error);
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

  private async getOrCreateAndSaveTeams({
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
    const allTeams: Team[] = await this.dbConn.manager.getCustomRepository(TeamRepository).getAllTeams();
    const existingTeams: Team[] = this.filterExistingTeams(allTeams, osuBanchoUserIdsGroupedInTeams);

    // create the teams
    let teamsToBeAddedToGame: Team[] = [].concat(existingTeams);
    const unsavedNewTeams: Team[] = this.createTeamsIfNew({
      osuUsers,
      osuBanchoUserIdsGroupedInTeams,
      existingTeams,
      addedBy: requestingUser
    });

    if (!unsavedNewTeams.length) {
      return teamsToBeAddedToGame;
    }

    // TODO: Optimize N-1
    const saved = await Team.save(unsavedNewTeams);
    const savedNewTeamIds = saved.map(team => team.id);
    const reloadedNewTeams = await this.dbConn.manager.getCustomRepository(TeamRepository).findByIds(savedNewTeamIds, {
      relations: ["teamOsuUsers", "teamOsuUsers.osuUser", "gameTeams"]
    });
    teamsToBeAddedToGame = teamsToBeAddedToGame.concat(reloadedNewTeams);

    return teamsToBeAddedToGame;

    // if (unsavedNewTeams.length) {
    //   // save the teams
    //   // (osu users already saved/fetched and existing as properties within "unsavedNewTeams")
    //   const savedNewTeamIds: number[] = await this.dbConn.manager.getCustomRepository(TeamRepository).chunkSave({
    //     values: unsavedNewTeams,
    //     entityType: Team
    //   });
    //   let teamOsuUsers = [];
    //   for (const t in unsavedNewTeams) {
    //     const team = unsavedNewTeams[t];
    //     teamOsuUsers.push(
    //       // ...team.teamOsuUsers.map(tou => ({ teamId: savedNewTeamIds[t], osuUserId: tou.osuUser.id, addedById: team.createdBy.id }))
    //       ...team.teamOsuUsers.map(tou => ({ team: team, osuUser: tou.osuUser, addedBy: team.createdBy }))
    //     ); // ...tou within {},
    //   }
    //   // save teamOsuUsers
    //   const savedTeamOsuUserIds = await this.dbConn.manager.getCustomRepository(TeamOsuUserRepository).chunkSave({
    //     values: teamOsuUsers,
    //     entityType: TeamOsuUser
    //   });

    //   // const reloadedNewTeams = await this.dbConn.manager.getCustomRepository(TeamRepository).findByIdsWithRelations({
    //   //   ids: savedNewTeamIds,
    //   //   returnWithRelations: ["teamOsuUsers", "teamOsuUsers.osuUser"]
    //   // });
    //   const reloadedNewTeams = await this.dbConn.manager.getCustomRepository(TeamRepository).findByIds(savedNewTeamIds, {
    //     relations: ["teamOsuUsers", "teamOsuUsers.osuUser", "gameTeams"]
    //   });
    //   teamsToBeAddedToGame = teamsToBeAddedToGame.concat(reloadedNewTeams);
    // }
  }

  private filterExistingTeams(haystackTeams: Team[], needleTeams: number[][]): Team[] {
    return haystackTeams.filter(t => {
      const teamOsuUserBanchoIds = t.teamOsuUsers.map(tou => tou.osuUser.osuUserId);
      for (const group of needleTeams) {
        const checkAgainstIds = group.map(uid => uid.toString());
        // below is true if the two arrays contain identical elements
        if (_.xor(teamOsuUserBanchoIds, checkAgainstIds).length === 0) {
          return true;
        }
      }
      return false;
    });
  }

  /**
   * Returns a list of OsuUsers in the list of API Osu Users added to a team in the given game.
   *
   * @private
   this.dbConn.manager.getCustomRepository(TeamOsuUserRepository) {Game} game
   * @param {ApiOsuUser[]} apiOsuUsers
   * @returns {Promise<OsuUser[]>}
   */
  private async getOsuUsersInGameFromApiUserResults(game: Game, apiOsuUsers: ApiOsuUser[]): Promise<OsuUser[]> {
    const osuUsersInGame = await this.dbConn.manager.getCustomRepository(OsuUserRepository).findOsuUsersInGame(game.id);
    // compare by Bancho osu user ID
    const results = osuUsersInGame.filter(osuUser => apiOsuUsers.find(apiOsuUser => apiOsuUser.userId.toString() === osuUser.osuUserId));
    return results;
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
      // issue: teamOsuUser has no osuUser
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
    team.createdBy = addedBy;
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
