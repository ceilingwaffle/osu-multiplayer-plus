import { inject } from "inversify";
import { GameService } from "./game.service";
import { CreateGameDto } from "./dto/index";
import { RequesterFactory } from "../../requests/requester-factory";
import { Response } from "../../requests/Response";
import { Game } from "./game.entity";
import { Message, FailureMessage } from "../../utils/message";
import { RequestDtoType } from "../../requests/dto/request.dto";
import { Requester } from "../../requests/requesters/requester";
import { Log } from "../../utils/Log";
import { RequesterFactoryInitializationError } from "../shared/errors/RequesterFactoryInitializationError";
import { CreateGameReport } from "./reports/create-game.report";
import { GameResponseFactory } from "./game-response-factory";

export class GameController {
  constructor(@inject(GameService) private readonly gameService: GameService) {
    Log.debug("Initialized Game Controller.");
  }

  /**
   * Creates a new game.
   *
   * @param {{ gameDto: CreateGameDto; requestDto: RequestDtoType }} gameData
   * @returns {Promise<Response<CreateGameReport>>}
   */
  public async create(gameData: { gameDto: CreateGameDto; requestDto: RequestDtoType }): Promise<Response<CreateGameReport>> {
    try {
      // build the requester
      const requester: Requester = RequesterFactory.initialize(gameData.requestDto);
      if (!requester) throw new RequesterFactoryInitializationError(this.constructor.name, this.create.name);

      // get/create the user creating the game
      const creatorResult = await requester.getOrCreateUser();
      if (creatorResult.failed()) {
        if (creatorResult.value.error) throw creatorResult.value.error;
        Log.methodFailure(this.create, this.constructor.name, creatorResult.value.reason);
        return {
          success: false,
          message: FailureMessage.get("gameCreateFailed"),
          errors: {
            messages: [creatorResult.value.reason],
            validation: creatorResult.value.validationErrors
          }
        };
      }

      // create and save the game
      const createGameResult = await this.gameService.createAndSaveGame(creatorResult.value.id, gameData.gameDto, gameData.requestDto);
      if (createGameResult.failed()) {
        if (createGameResult.value.error) throw createGameResult.value.error;
        Log.methodFailure(this.create, this.constructor.name, createGameResult.value.reason);
        return {
          success: false,
          message: FailureMessage.get("gameCreateFailed"),
          errors: {
            messages: [createGameResult.value.reason],
            validation: createGameResult.value.validationErrors
          }
        };
      }

      // return new game creation success response
      const game: Game = createGameResult.value;
      Log.methodSuccess(this.create, this.constructor.name);
      return {
        success: true,
        message: Message.get("gameCreateSuccess"),
        result: ((): CreateGameReport => {
          const gameResponseFactory = new GameResponseFactory(requester, game, gameData.requestDto);
          return {
            teamLives: game.teamLives,
            countFailedScores: game.countFailedScores,
            status: game.status,
            createdBy: gameResponseFactory.getCreator(),
            refereedBy: gameResponseFactory.getReferees(),
            messageTargets: gameResponseFactory.getMessageTargets()
          };
        })()
      };
    } catch (error) {
      Log.methodError(this.create, this.constructor.name, error);
      return {
        success: false,
        message: FailureMessage.get("gameCreateFailed"),
        errors: {
          messages: [error]
        }
      };
    }
  }
}
