import { inject } from "inversify";
import { getCustomRepository } from "typeorm";
import { Game } from "./game.entity";
import { CreateGameDto } from "./dto/create-game.dto";
import { Either, failurePromise, successPromise } from "../../utils/Either";
import { Failure } from "../../utils/Failure";
import {
  GameFailure,
  invalidGamePropertiesFailure,
  gameDoesNotExistFailure,
  gameStatusNotAllowedFailure,
  userHasNotCreatedGameFailure
} from "./game.failure";
import { UserService } from "../user/user.service";
import { UserFailure } from "../user/user.failure";
import { validate } from "class-validator";
import { Log } from "../../utils/Log";
import { GameRepository } from "./game.repository";
import { RequestDto } from "../../requests/dto";
import { GameDefaults } from "./game-defaults";
import { GameStatus } from "./game-status";
import { EndGameDto } from "./dto/end-game.dto";
import { OsuLobbyWatcher } from "../../osu/osu-lobby-watcher";
import { LobbyStatus } from "../lobby/lobby-status";
import { User } from "../user/user.entity";
import { Helpers } from "../../utils/helpers";
import { UpdateGameDto } from "./dto/update-game.dto";
import { RequestDtoType } from "../../requests/dto/request.dto";
import { GameMessageTargetAction } from "./game-message-target-action";

export class GameService {
  private readonly gameRepository: GameRepository = getCustomRepository(GameRepository);

  constructor(@inject(UserService) private readonly userService: UserService) {
    Log.info("Initialized Game Service.");
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
    requestData: RequestDto,
    returnWithRelations: string[] = ["createdBy", "createdBy.discordUser", "refereedBy", "refereedBy.discordUser"]
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
        countFailedScores: gameData.countFailedScores != null ? gameData.countFailedScores : GameDefaults.countFailedScores,
        createdBy: gameCreator,
        status: GameStatus.IDLE_NEWGAME.getKey(),
        refereedBy: [gameCreator],
        messageTargets: [
          {
            type: requestData.type,
            // authorId: requestData.authorId,
            channelId: requestData.originChannelId
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
      const savedGame = await this.gameRepository.save(game);
      const reloadedGame = await this.gameRepository.findOneOrFail(savedGame.id, {
        relations: returnWithRelations
      });
      // return the saved game
      Log.methodSuccess(this.createAndSaveGame, this.constructor.name);
      return successPromise(reloadedGame);
    } catch (error) {
      Log.methodError(this.createAndSaveGame, this.constructor.name, error);
      throw error;
    }
  }

  public async endGame({
    gameDto,
    endedByUser
  }: {
    gameDto: EndGameDto;
    endedByUser: User;
  }): Promise<Either<Failure<GameFailure | UserFailure>, Game>> {
    try {
      const gameId = gameDto.gameId;
      const game = await this.gameRepository.findGameIncludingLobbiesWithStatus(gameId, LobbyStatus.getNotClosed());
      if (!game) {
        const failure = gameDoesNotExistFailure(gameId);
        Log.methodFailure(this.endGame, this.constructor.name, failure.reason);
        return failurePromise(failure);
      }
      if (GameStatus.isEndedStatus(game.status)) {
        const failure = gameStatusNotAllowedFailure(gameId, game.status);
        Log.methodFailure(this.endGame, this.constructor.name, failure.reason);
        return failurePromise(failure);
      }

      if (game.lobbies) {
        const unwatchedBanchoMultiplayerIds = await Promise.all(
          game.lobbies
            // for all bancho multiplayer ids belongings to this game
            .map(lobby => lobby.banchoMultiplayerId)
            // call unwatch on all lobbies for this game on the lobby scanner.
            .map(mpid => OsuLobbyWatcher.getInstance().unwatch({ gameId: gameId, banchoMultiplayerId: mpid }))
        );
        Log.debug("Unwatched MP IDs: ", unwatchedBanchoMultiplayerIds);
      }

      // update game status in database
      await this.gameRepository.update(gameId, {
        status: GameStatus.MANUALLY_ENDED.getKey(),
        endedAt: Helpers.getNow(),
        endedBy: endedByUser
      });
      Log.debug(`Updated game wtih ended-data.`);

      // return the updated game
      const reloadedGame = await this.gameRepository.findGame(gameId);
      Log.methodSuccess(this.endGame, this.constructor.name);
      return successPromise(reloadedGame);
    } catch (error) {
      Log.methodError(this.endGame, this.constructor.name, error);
      throw error;
    }
  }

  public async updateGame(
    gameDto: UpdateGameDto,
    requestDto: RequestDtoType,
    returnWithRelations: string[] = ["createdBy", "createdBy.discordUser", "refereedBy", "refereedBy.discordUser"]
  ): Promise<Either<Failure<GameFailure | UserFailure>, Game>> {
    try {
      // assume permissions have been checked before this method was called

      // find the game
      const gameId = gameDto.gameId;
      let game = await this.gameRepository.findGame(gameId);
      if (!game) {
        const failure = gameDoesNotExistFailure(gameId);
        Log.methodFailure(this.updateGame, this.constructor.name, failure.reason);
        return failurePromise(failure);
      }

      // update the game object
      this.updateGameWithGameMessageTargetAction(game, gameDto.gameMessageTargetAction);
      // TODO: Add more props to the UpdateGameDTO and update the game here

      // validate the game
      const errors = await validate(game);
      if (errors.length > 0) {
        Log.methodFailure(this.updateGame, this.constructor.name, `Game validation failed when trying to update game ID ${gameId}.`);
        return failurePromise(invalidGamePropertiesFailure(errors));
      }

      // save the game
      const savedGame = await this.gameRepository.save(game);
      const reloadedGame = await this.gameRepository.findOneOrFail(savedGame.id, {
        relations: returnWithRelations
      });
      // return the saved game
      Log.methodSuccess(this.createAndSaveGame, this.constructor.name);
      return successPromise(reloadedGame);
    } catch (error) {}
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
      game.messageTargets.push({ type: gmtAction.type, channelId: gmtAction.channelId });
    } else if (gmtAction.action === "remove") {
      const i = game.messageTargets.indexOf(gmtAction);
      if (i < 0) throw new Error("Cannot remove Game Message Target because it does not exist.");
      game.messageTargets.splice(i, 1);
    } else if (gmtAction.action === "overwrite-all") {
      game.messageTargets = [{ type: gmtAction.type, channelId: gmtAction.channelId }];
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
}
