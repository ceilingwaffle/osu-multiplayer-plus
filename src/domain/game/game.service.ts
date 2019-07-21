import { inject } from "inversify";
import { Repository } from "typeorm";
import { Game } from "./game.entity";
import { CreateGameDto } from "./dto/create-game.dto";
import { Either, failurePromise, successPromise } from "../../utils/Either";
import { Failure } from "../../utils/Failure";
import { GameFailure, invalidCreationArgumentsFailure } from "./game.failure";
import { UserService } from "../user/user.service";
import { UserFailure } from "../user/user.failure";
import { validate } from "class-validator";
import { Log } from "../../utils/Log";

export class GameService {
  constructor(
    @inject(Repository) private readonly gameRepository: Repository<Game>,
    @inject(UserService) private readonly userService: UserService
  ) {
    console.debug("Initialized Game Service.");
  }

  /**
   * Creates a new game.
   *
   * @param {number} userId {User} ID of the game creator
   * @param {CreateGameDto} gameData
   * @returns {Promise<Either<Failure<GameFailure>, Game>>}
   * @memberof GameService
   */
  async create(userId: number, gameData: CreateGameDto): Promise<Either<Failure<GameFailure | UserFailure>, Game>> {
    // get the game creator
    const userResult = await this.userService.findOne({ id: userId });
    if (userResult.failed()) {
      if (userResult.value.error) throw userResult.value.error;
      Log.methodFailure(this.create, this, userResult.value.reason);
      return failurePromise(userResult.value);
    }
    // create the game
    const game = this.gameRepository.create({
      teamLives: gameData.teamLives,
      countFailedScores: gameData.countFailedScores,
      createdBy: userResult.value
    });
    // validate the game
    const errors = await validate(game);
    if (errors.length > 0) {
      Log.methodFailure(this.create, this, "Game validation failed.");
      return failurePromise(invalidCreationArgumentsFailure(errors));
    }
    // save the game
    const savedGame = await this.gameRepository.save(game);
    // return the saved game
    Log.methodSuccess(this.create, this);
    return successPromise(savedGame);
  }
}
