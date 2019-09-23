import { TYPES } from "../../types";
import { inject, injectable } from "inversify";
import { getCustomRepository } from "typeorm";
import { Game } from "./game.entity";
import { CreateGameDto } from "./dto/create-game.dto";
import { Either, failurePromise, successPromise, success } from "../../utils/Either";
import { Failure } from "../../utils/Failure";
import {
  GameFailure,
  invalidGamePropertiesFailure,
  gameDoesNotExistFailure,
  gameCannotBeEndedDueToStatusFailure,
  userHasNotCreatedGameFailure
} from "./game.failure";
import { UserService } from "../user/user.service";
import { UserFailure } from "../user/user.failure";
import { validate, ValidationError } from "class-validator";
import { Log } from "../../utils/Log";
import { GameRepository } from "./game.repository";
import { RequestDto } from "../../requests/dto";
import { GameDefaults } from "./game-defaults";
import { GameStatus } from "./game-status";
import { EndGameDto } from "./dto/end-game.dto";
import { User } from "../user/user.entity";
import { Helpers } from "../../utils/helpers";
import { UpdateGameDto } from "./dto/update-game.dto";
import { GameMessageTargetAction } from "./game-message-target-action";
import { UserGameRoleRepository } from "../role/user-game-role.repository";
import { getLowestUserRole } from "../role/role.type";
import { IOsuLobbyScanner } from "../../osu/interfaces/osu-lobby-scanner";
import { CommunicationClientType } from "../../communication-types";
import { PermissionsFailure } from "../../permissions/permissions.failure";
import { Permissions } from "../../permissions/permissions";
import { UserRepository } from "../user/user.repository";

@injectable()
export class GameService {
  private readonly gameRepository: GameRepository = getCustomRepository(GameRepository);
  private readonly userGameRoleRepository: UserGameRoleRepository = getCustomRepository(UserGameRoleRepository);
  private readonly userRepository: UserRepository = getCustomRepository(UserRepository);

  constructor(
    @inject(TYPES.UserService) protected userService: UserService,
    @inject(TYPES.IOsuLobbyScanner) protected osuLobbyScanner: IOsuLobbyScanner,
    @inject(TYPES.Permissions) protected permissions: Permissions
  ) {
    Log.info(`Initialized ${this.constructor.name}.`);
  }

  /**
   * Creates a new game.
   *
   * @param {number} userId User entity ID of the game creator
   * @param {CreateGameDto} gameData
   * @returns {Promise<Either<Failure<GameFailure>, Game>>}
   * @memberof GameService
   */
  public async createAndSaveGame(
    userId: number,
    gameData: CreateGameDto,
    requestData: RequestDto
  ): Promise<Either<Failure<GameFailure | UserFailure>, Game>> {
    try {
      // get the game creator
      const userResult = await this.userService.findOne({ id: userId });
      if (userResult.failed()) {
        if (userResult.value.error) throw userResult.value.error;
        Log.methodFailure(this.createAndSaveGame, this.constructor.name, userResult.value.reason);
        return failurePromise(userResult.value);
      }
      const gameCreator = userResult.value;

      // create the game
      const game = this.gameRepository.create({
        teamLives: gameData.teamLives != null ? gameData.teamLives : GameDefaults.teamLives,
        countFailedScores: Helpers.determineCountFailedScoresValue(
          gameData.countFailedScores != null ? gameData.countFailedScores : GameDefaults.countFailedScores
        ),
        createdBy: gameCreator, // createdBy: gameCreator.userGameRoles.filter(ugr => ugr.user.id === gameCreator.id),
        status: GameStatus.IDLE_NEWGAME.getKey(),
        messageTargets: [
          {
            commType: requestData.commType,
            authorId: requestData.authorId,
            channelId: requestData.originChannelId,
            channelType: "initial-channel"
          }
        ]
      });

      // validate the game
      const errors = await validate(game);
      if (errors.length > 0) {
        Log.methodFailure(this.createAndSaveGame, this.constructor.name, "Game validation failed.");
        return failurePromise(invalidGamePropertiesFailure(errors));
      }

      // save the game
      const reloadedGame = await this.saveAndReloadGame(game);

      Log.methodSuccess(this.createAndSaveGame, this.constructor.name);
      return successPromise(reloadedGame);
    } catch (error) {
      Log.methodError(this.createAndSaveGame, this.constructor.name, error);
      throw error;
    }
  }

  // private convertTextToBoolean(text: "true" | "false", valueIfTextNull: boolean): boolean {
  //   return text != null ? (text === "true" ? true : false) : valueIfTextNull;
  // }

  private isValidGameId(gameId: number): boolean {
    if (!Number.isInteger(gameId)) {
      Log.warn("Game ID is invalid.");
      return false;
    } else {
      return true;
    }
  }

  /**
   * Attempts to end a game by stopping any watchers running for lobbies of the game (if they're not longer being used for any other games),
   * and updates the game status to some appropriate game-ended-status.
   *
   * @param {{
   *     gameDto: EndGameDto;
   *     endedByUser: User;
   *   }} {
   *     gameDto,
   *     endedByUser
   *   }
   * @returns {(Promise<Either<Failure<GameFailure | UserFailure>, Game>>)}
   * @memberof GameService
   */
  public async endGame({
    gameDto,
    endedByUser
  }: {
    gameDto: EndGameDto;
    endedByUser: User;
  }): Promise<Either<Failure<GameFailure | UserFailure>, Game>> {
    try {
      const gameId = gameDto.gameId;

      // validate the game ID
      if (!this.isValidGameId(gameId)) {
        Log.methodFailure(this.endGame, this.constructor.name, "End-game validation failed.");
        return failurePromise(invalidGamePropertiesFailure(this.makeValidationErrorsOfGameId(gameId)));
      }

      const game = await this.gameRepository.findGameWithLobbies(gameId);
      if (!game) {
        const failure = gameDoesNotExistFailure(gameId);
        Log.methodFailure(this.endGame, this.constructor.name, failure.reason);
        return failurePromise(failure);
      }
      if (GameStatus.isEndedStatus(game.status)) {
        const failure = gameCannotBeEndedDueToStatusFailure(gameId, game.status);
        Log.methodFailure(this.endGame, this.constructor.name, failure.reason);
        return failurePromise(failure);
      }

      if (game.gameLobbies) {
        await Promise.all(
          game.gameLobbies
            .filter(gameLobby => gameLobby.lobby && gameLobby.lobby.banchoMultiplayerId)
            // for all bancho multiplayer ids belongings to this game
            .map(gameLobby => gameLobby.lobby.banchoMultiplayerId)
            // call unwatch on all lobbies for this game on the lobby scanner.
            .map(async banchoMultiplayerId => await this.osuLobbyScanner.unwatch(gameId, banchoMultiplayerId))
          // GL: .map(mpid => OsuLobbyWatcher.getInstance().unwatch({ gameId: gameId, banchoMultiplayerId: mpid }))
        );
      }

      // update game status in database
      await this.updateGameAsEnded(gameId, endedByUser);

      // return the updated game
      const reloadedGame = await this.gameRepository.findGame(gameId);
      Log.methodSuccess(this.endGame, this.constructor.name);
      return successPromise(reloadedGame);
    } catch (error) {
      Log.methodError(this.endGame, this.constructor.name, error);
      throw error;
    }
  }

  private makeValidationErrorsOfGameId(gameId: number) {
    const validationErrors = [new ValidationError()];
    validationErrors[0].property = "id";
    validationErrors[0].value = gameId;
    return validationErrors;
  }

  private async updateGameAsEnded(gameId: number, endedByUser: User) {
    await this.gameRepository.update(gameId, {
      status: GameStatus.MANUALLY_ENDED.getKey(),
      endedAt: Helpers.getNow(),
      endedBy: endedByUser
    });
    Log.methodSuccess(this.updateGameAsEnded, this.constructor.name, { gameId: gameId });
  }

  public async updateGame(
    gameDto: UpdateGameDto,
    requestingUser: User,
    requestingCommType: CommunicationClientType
  ): Promise<Either<Failure<GameFailure | UserFailure | PermissionsFailure>, Game>> {
    try {
      // TODO: Refactor some way to not include requestingCommType. The service layer shouldn't care at all about where the request came from. We should be building the Discord error message in the DiscordErrorMessageBuilder class instead of in the Permissions class.

      // get the user's most-recent game created if no game ID was specified in the request
      const foundGameResult: Either<Failure<GameFailure>, Game> = await this.getRequestingUserTargetGame({
        userId: requestingUser.id,
        gameId: gameDto.gameId
      });
      if (foundGameResult.failed()) {
        // no game exists created by the user, or no game exists for the provided game ID
        Log.methodFailure(this.updateGame, this.constructor.name, foundGameResult.value.reason, foundGameResult.value.error);
        return failurePromise(foundGameResult.value);
      }
      const game = foundGameResult.value;

      // check if user is permitted to update the game
      const userRole = await this.getUserRoleForGame(requestingUser.id, game.id);
      const userPermittedResult = await this.permissions.checkUserPermission({
        user: requestingUser,
        userRole: userRole,
        action: "update",
        resource: "game",
        entityId: game.id,
        requesterClientType: requestingCommType
      });
      if (userPermittedResult.failed()) {
        Log.methodFailure(
          this.updateGame,
          this.constructor.name,
          `User ${requestingUser.id} does not have permission to update game ${game.id}.`
        );
        return failurePromise(userPermittedResult.value);
      }

      // update the game object
      if (gameDto.gameMessageTargetAction) this.updateGameWithGameMessageTargetAction(game, gameDto.gameMessageTargetAction);
      if (gameDto.teamLives != null) game.teamLives = gameDto.teamLives;
      if (gameDto.countFailedScores != null) {
        game.countFailedScores = Helpers.determineCountFailedScoresValue(gameDto.countFailedScores);
      }

      // validate the game
      const errors = await validate(game);
      if (errors.length > 0) {
        Log.methodFailure(this.updateGame, this.constructor.name, `Game validation failed when trying to update game ID ${game.id}.`);
        return failurePromise(invalidGamePropertiesFailure(errors));
      }

      // save the game
      const reloadedGame = await this.saveAndReloadGame(game);

      // return the saved game
      Log.methodSuccess(this.updateGame, this.constructor.name);
      return successPromise(reloadedGame);
    } catch (error) {
      Log.methodError(this.updateGame, this.constructor.name, error);
      throw error;
    }
  }

  /**
   * Returns the user's role for a game, or the standard user-role if the user has no role assigned for the game.
   *
   * @param {number} userId
   * @param {number} gameId
   * @returns {Promise<string>}
   */
  public async getUserRoleForGame(userId: number, gameId: number): Promise<string> {
    const role = await this.userGameRoleRepository.findUserRoleForGame(gameId, userId);
    return role ? role : getLowestUserRole();
  }

  /**
   * Updates the message-target property on the Game in a some specific way (e.g. append, overwrite) depending on the action specified.
   *
   * @private
   * @param {Game} game
   * @param {GameMessageTargetAction} gmtAction
   * @returns {Game} The updated game
   * @memberof GameService
   */
  private updateGameWithGameMessageTargetAction(game: Game, gmtAction: GameMessageTargetAction): void {
    if (!game) {
      const reason = "Game is not defined.";
      Log.methodError(this.updateGameWithGameMessageTargetAction, this.constructor.name), reason;
      throw new Error(reason);
    }
    if (!game.messageTargets) {
      const reason = "Game has no message-targets array.";
      Log.methodError(this.updateGameWithGameMessageTargetAction, this.constructor.name), reason;
      throw new Error(reason);
    }

    if (gmtAction.action === "add") {
      game.messageTargets.push({
        authorId: gmtAction.authorId,
        commType: gmtAction.commType,
        channelId: gmtAction.channelId,
        channelType: gmtAction.channelType
      });
      Log.debug(`Added game message target to game ${game.id}.`);
    } else if (gmtAction.action === "remove") {
      const i = game.messageTargets.indexOf(gmtAction);
      if (i < 0) throw new Error("Cannot remove Game Message Target because it does not exist.");
      game.messageTargets.splice(i, 1);
      Log.debug(`Removed game message target from game ${game.id}.`);
    } else if (gmtAction.action === "overwrite-all") {
      game.messageTargets = [
        {
          authorId: gmtAction.authorId,
          commType: gmtAction.commType,
          channelId: gmtAction.channelId,
          channelType: gmtAction.channelType
        }
      ];
      Log.debug(`Overwrote all game message targets on game ${game.id}.`);
    } else {
      const _exhaustiveCheck: never = gmtAction.action;
      return _exhaustiveCheck;
    }
  }

  public async findMostRecentGameCreatedByUser(userId: number): Promise<Either<Failure<GameFailure>, Game>> {
    try {
      const game = await this.gameRepository.getMostRecentGameCreatedByUser(userId);
      if (!game) {
        return failurePromise(userHasNotCreatedGameFailure(userId));
      }
      return successPromise(game);
    } catch (error) {
      Log.methodError(this.findMostRecentGameCreatedByUser, this.constructor.name, error);
      throw error;
    }
  }

  public async findGameById(gameId: number, relations?: string[]): Promise<Either<Failure<GameFailure>, Game>> {
    try {
      // validate the game ID
      if (!this.isValidGameId(gameId)) {
        Log.methodFailure(this.endGame, this.constructor.name, `Game ID ${gameId} is invalid.`);
        return failurePromise(invalidGamePropertiesFailure(this.makeValidationErrorsOfGameId(gameId)));
      }

      // find the game
      const game = await this.gameRepository.findOne({ id: gameId }, { relations: relations });

      if (!game) {
        return failurePromise(gameDoesNotExistFailure(gameId));
      }

      return successPromise(game);
    } catch (error) {
      Log.methodError(this.findGameById, this.constructor.name, error);
      throw error;
    }
  }

  public isGameActive(game: Game): boolean {
    try {
      return GameStatus.isActiveStatus(game.status);
    } catch (error) {
      Log.methodError(this.isGameActive, this.constructor.name, error);
      throw error;
    }
  }

  public isGameEnded(game: Game): boolean {
    try {
      return GameStatus.isEndedStatus(game.status);
    } catch (error) {
      Log.methodError(this.isGameEnded, this.constructor.name, error);
      throw error;
    }
  }

  public async updateGameStatusForGameId({
    gameId,
    status
  }: {
    gameId: number;
    status: GameStatus;
  }): Promise<Either<Failure<GameFailure>, Game>> {
    try {
      const findGameResult = await this.findGameById(gameId);
      if (findGameResult.failed()) return findGameResult;
      const game = findGameResult.value;
      return await this.updateGameStatusForGameEntity({ game, status });
    } catch (error) {
      Log.methodError(this.updateGameStatusForGameId, this.constructor.name, error);
      throw error;
    }
  }

  public async updateGameStatusForGameEntity({
    game,
    status
  }: {
    game: Game;
    status: GameStatus;
  }): Promise<Either<Failure<GameFailure>, Game>> {
    try {
      game.status = status.getKey();
      const savedGame = await this.gameRepository.save(game);
      return successPromise(savedGame);
    } catch (error) {
      Log.methodError(this.updateGameStatusForGameEntity, this.constructor.name, error);
      throw error;
    }
  }

  /**
   * If a game ID is provided, we return that game (if it exists).
   * If no game ID is provided, we attempt to return the game targetted by the user if they used the !targetgame command.
   * If the user did not use the !targetgame command, we return their most recent game created.
   * Game ID should be provided as undefined (or "-1" if none was given by the user at the boundary).
   *
   * @param {{ userId: number; gameId?: number }} { userId, gameId }
   * @returns {Promise<Either<Failure<GameFailure>, Game>>}
   * @memberof GameService
   */
  async getRequestingUserTargetGame({ userId, gameId }: { userId: number; gameId?: number }): Promise<Either<Failure<GameFailure>, Game>> {
    // Game ID will be provided as "-1" if none was given by the user at the boundary.
    // Get the game targetted by the game ID provided in the request.
    if (gameId && gameId > 0) return this.findGameById(gameId);

    // check if the user used the !targetgame command
    const user = await this.userRepository.findOne({ id: userId }, { relations: ["targetGame"] });
    if (user.targetGame) return successPromise(user.targetGame);

    // If a game ID was not provided, get the most recent game created by the user ID (lobby creator).
    return this.findMostRecentGameCreatedByUser(userId);
  }

  private async saveAndReloadGame(
    game: Game,
    returnWithRelations: string[] = [
      "createdBy",
      "createdBy.discordUser",
      "createdBy.webUser",
      "userGameRoles",
      "userGameRoles.user",
      "userGameRoles.user.discordUser",
      "userGameRoles.user.webUser"
    ]
  ): Promise<Game> {
    try {
      // TODO: Optimize - some way of combining these into a single query
      const savedGame = await this.gameRepository.save(game);
      const reloadedGame = await this.gameRepository.findOneOrFail(savedGame.id, {
        relations: returnWithRelations
      });
      return reloadedGame;
    } catch (error) {
      Log.methodError(this.saveAndReloadGame, this.constructor.name, error);
      throw error;
    }
  }
}
