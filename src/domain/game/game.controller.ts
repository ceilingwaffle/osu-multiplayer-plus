import { inject } from "inversify";
import { GameService } from "./game.service";
import { CreateGameDto } from "./dto/index";
import { RequesterFactory } from "../../requests/requester-factory";
import { Response } from "../../requests/Response";
import { Game } from "./game.entity";
import { Message, FailureMessage } from "../../utils/message";
import { RequestDto } from "../../requests/dto/request.dto";
import { Requester } from "../../requests/requesters/requester";
import { Log } from "../../utils/Log";

export class GameController {
  constructor(@inject(GameService) private readonly gameService: GameService) {
    console.debug("Initialized Game Controller.");
  }

  /**
   * Creates a new game.
   *
   * @param {{ gameDto: CreateGameDto; requestDto: RequestDto }} gameData
   * @returns {Promise<Response<Game>>}
   * @memberof GameController
   */
  async create(gameData: { gameDto: CreateGameDto; requestDto: RequestDto }): Promise<Response<Game>> {
    try {
      // build the requester
      const requester: Requester = RequesterFactory.initialize(gameData.requestDto);
      if (!requester) throw new Error("Error initializing the requester factory. This should never happen.");

      // get/create the game creator user from the request
      const creatorResult = await requester.getOrCreateUser();
      if (creatorResult.failed()) {
        if (creatorResult.value.error) throw creatorResult.value.error;
        Log.methodFailure(this.create, this.constructor.name, creatorResult.value.reason);
        return {
          success: false,
          message: FailureMessage.get("gameCreateFailed", creatorResult.value.reason)
        };
      }

      // create the game
      const createGameResult = await this.gameService.create(creatorResult.value.id, gameData.gameDto);
      if (createGameResult.failed()) {
        if (createGameResult.value.error) throw createGameResult.value.error;
        Log.methodFailure(this.create, this.constructor.name, createGameResult.value.reason);
        return {
          success: false,
          message: FailureMessage.get("gameCreateFailed", createGameResult.value.reason)
        };
      }

      // successfully created new game
      const game: Game = createGameResult.value;
      Log.methodSuccess(this.create, this.constructor.name);
      return {
        success: true,
        message: Message.get("gameCreateSuccess"),
        result: game
      };
    } catch (error) {
      Log.methodError(this.create, this.constructor.name, error);
      return {
        success: false,
        message: FailureMessage.get("gameCreateFailed", error)
      };
    }
  }
}
