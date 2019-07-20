import { inject } from "inversify";
import { GameService } from "./game.service";
import { CreateGameDto } from "./dto/index";
import { RequesterFactory } from "../../requests/requester-factory";
import { Response } from "../../requests/Response";
import { Game } from "./game.entity";
import { Message, FailureMessage } from "../../utils/message";
import { User } from "../user/user.entity";
import { RequestDto } from "../shared/dto/request.dto";
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
    // process the request
    let requester: Requester;
    try {
      requester = RequesterFactory.initialize(gameData.requestDto.type);
      if (!requester) {
        throw new Error("Error initializing the requester factory. This should never happen.");
      }
    } catch (error) {
      Log.methodError(this.create, this, error);
      return {
        success: false,
        message: FailureMessage.get("gameCreateFailed", error)
      };
    }

    let creator: User;
    try {
      // get/create the game creator from the request
      const creatorResult = await requester.getOrCreateUser();
      if (creatorResult.failed()) {
        if (creatorResult.value.error) {
          // unhandled error
          Log.methodError(
            this.create,
            this,
            creatorResult.value.reason,
            creatorResult.value.error ? creatorResult.value.error.message : null
          );
          return {
            success: false,
            message: FailureMessage.get(
              "gameCreateFailed",
              creatorResult.value.reason,
              creatorResult.value.error ? creatorResult.value.error.message : null
            )
          };
        }
        // handled failure
        Log.methodFailure(this.create, this, creatorResult.value.reason);
        return {
          success: false,
          message: creatorResult.value.reason
        };
      }
      // successfully got the game creator User
      creator = creatorResult.value;
      // create the game
      const createGameResult = await this.gameService.create(creator.id, gameData.gameDto);
      if (createGameResult.failed()) {
        return {
          success: false,
          message: FailureMessage.get(
            "gameCreateFailed",
            createGameResult.value.reason,
            createGameResult.value.error ? createGameResult.value.error.message : null
          )
        };
      }
      Log.methodSuccess(this.create, this);
      return {
        success: true,
        message: Message.get("gameCreateSuccess"),
        result: createGameResult.value
      };
    } catch (error) {
      Log.methodError(this.create, this, error);
      return {
        success: false,
        message: FailureMessage.get("gameCreateFailed", error)
      };
    }
  }
}
