import { inject } from "inversify";
import { getCustomRepository } from "typeorm";
import { Game } from "./game.entity";
import { CreateGameDto } from "./dto/create-game.dto";
import { Either, failurePromise, successPromise } from "../../utils/Either";
import { Failure } from "../../utils/Failure";
import { GameFailure, invalidCreationArgumentsFailure, gameDoesNotExistFailure } from "./game.failure";
import { UserService } from "../user/user.service";
import { UserFailure } from "../user/user.failure";
import { validate } from "class-validator";
import { Log } from "../../utils/Log";
import { GameRepository } from "./game.repository";
import { RequestDto } from "../../requests/dto";
import { GameDefaults } from "./game-defaults";
import { GameStatus } from "./game-status";

export class GameService {
  private readonly gameRepository: GameRepository = getCustomRepository(GameRepository);

  constructor(@inject(UserService) private readonly userService: UserService) {
    Log.debug("Initialized Game Service.");
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
        status: GameStatus.IDLE,
        refereedBy: [gameCreator],
        messageTargets: [
          {
            type: requestData.type,
            authorId: requestData.authorId,
            channel: requestData.originChannel
          }
        ]
      });
      // validate the game
      const errors = await validate(game);
      if (errors.length > 0) {
        Log.methodFailure(this.createAndSaveGame, this.constructor.name, "Game validation failed.");
        return failurePromise(invalidCreationArgumentsFailure(errors));
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

  public async findMostRecentGameCreatedByUser(userId: number): Promise<Either<Failure<GameFailure>, Game>> {
    try {
      const game = await this.gameRepository
        .createQueryBuilder("games")
        .leftJoin("games.createdBy", "user")
        .where("user.id = :userId", { userId: userId })
        .orderBy("games.createdAt", "DESC")
        .getOne();
      if (!game) {
        return failurePromise(gameDoesNotExistFailure(`No games have been created by user ID ${userId}.`));
      }
      return successPromise(game);
    } catch (error) {
      Log.methodError(this.findMostRecentGameCreatedByUser, this.constructor.name, error);
      throw error;
    }
  }

  public async findGameById(gameId: number): Promise<Either<Failure<GameFailure>, Game>> {
    try {
      const game = await this.gameRepository.findOne({ id: gameId });
      if (!game) {
        return failurePromise(gameDoesNotExistFailure(`A game does not exist with game ID ${gameId}.`));
      }
      return successPromise(game);
    } catch (error) {
      Log.methodError(this.findGameById, this.constructor.name, error);
      throw error;
    }
  }
}
