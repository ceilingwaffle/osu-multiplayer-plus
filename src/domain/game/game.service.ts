import { inject } from "inversify";
import { Repository } from "typeorm";
import { Game } from "./game.entity";
import { CreateGameDto } from "./dto/create-game.dto";
import { Either } from "../../utils/Either";
import { Failure } from "../../utils/Failure";
import { GameFailure } from "./game.failure";

export class GameService {
  constructor(@inject(Repository) private readonly gameRepository: Repository<Game>) {
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
  async create(userId: number, gameData: CreateGameDto): Promise<Either<Failure<GameFailure>, Game>> {
    throw new Error("Method not implemented: " + this.create);
  }
}
