import { inject } from "inversify";
import { Repository, getCustomRepository } from "typeorm";
import { Game } from "./game.entity";
import { CreateGameDto } from "./dto/create-game.dto";
import { Either, failurePromise, successPromise } from "../../utils/Either";
import { Failure } from "../../utils/Failure";
import { GameFailure, invalidCreationArgumentsFailure } from "./game.failure";
import { UserService } from "../user/user.service";
import { UserFailure } from "../user/user.failure";
import { validate } from "class-validator";
import { Log } from "../../utils/Log";
import { GameRepository } from "./game.repository";
import { RequestDto } from "../../requests/dto";
import { GameDefaults } from "./values/game-defaults";
import { GameStatusType } from "./types/game-status-type";

export class GameService {
  private readonly gameRepository: GameRepository = getCustomRepository(GameRepository);

  constructor(@inject(UserService) private readonly userService: UserService) {
    Log.debug("Initialized Game Service.");
  }

  /**
   * Creates a new game.
   *
   * @param {number} userId {User} ID of the game creator
   * @param {CreateGameDto} gameDto
   * @returns {Promise<Either<Failure<GameFailure>, Game>>}
   * @memberof GameService
   */
  async create(
    userId: number,
    gameDto: CreateGameDto,
    createRequestDto: RequestDto,
    returnWithRelations: string[] = ["createdBy", "createdBy.discordUser", "refereedBy", "refereedBy.discordUser"]
  ): Promise<Either<Failure<GameFailure | UserFailure>, Game>> {
    // get the game creator
    const userResult = await this.userService.findOne({ id: userId });
    if (userResult.failed()) {
      if (userResult.value.error) throw userResult.value.error;
      Log.methodFailure(this.create, this.constructor.name, userResult.value.reason);
      return failurePromise(userResult.value);
    }
    const gameCreator = userResult.value;
    // create the game
    const game = this.gameRepository.create({
      teamLives: gameDto.teamLives != null ? gameDto.teamLives : GameDefaults.teamLives,
      countFailedScores: gameDto.countFailedScores != null ? gameDto.countFailedScores : GameDefaults.countFailedScores,
      createdBy: gameCreator,
      status: GameStatusType.IDLE,
      refereedBy: [gameCreator],
      messageTargets: [
        {
          type: createRequestDto.type,
          authorId: createRequestDto.authorId,
          channel: createRequestDto.originChannel
        }
      ]
    });
    // validate the game
    const errors = await validate(game);
    if (errors.length > 0) {
      Log.methodFailure(this.create, this.constructor.name, "Game validation failed.");
      return failurePromise(invalidCreationArgumentsFailure(errors));
    }
    // save the game
    const savedGame = await this.gameRepository.save(game);
    const reloadedGame = await this.gameRepository.findOneOrFail(savedGame.id, {
      relations: returnWithRelations
    });
    // return the saved game
    Log.methodSuccess(this.create, this.constructor.name);
    return successPromise(reloadedGame);
  }
}
