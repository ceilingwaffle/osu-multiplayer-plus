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
import { UpdateGameReport } from "./reports/update-game.report";
import { GameResponseFactory } from "./game-response-factory";
import { GameStatus } from "./game-status";
import { EndGameDto } from "./dto/end-game.dto";
import { EndGameReport } from "./reports/end-game.report";
import { UpdateGameDto } from "./dto/update-game.dto";

export class GameController {
  constructor(@inject(GameService) private readonly gameService: GameService) {
    Log.info("Initialized Game Controller.");
  }

  /**
   * Creates a new game.
   *
   * @param {{ gameDto: CreateGameDto; requestDto: RequestDtoType }} gameData
   * @returns {Promise<Response<UpdateGameReport>>}
   */
  public async create(gameData: { gameDto: CreateGameDto; requestDto: RequestDtoType }): Promise<Response<UpdateGameReport>> {
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
        result: ((): UpdateGameReport => {
          const responseFactory = new GameResponseFactory(requester, game, gameData.requestDto);
          return {
            gameId: game.id,
            teamLives: game.teamLives,
            countFailedScores: game.countFailedScores,
            status: GameStatus.getTextFromKey(game.status),
            createdBy: responseFactory.getCreator(),
            createdAgo: responseFactory.getCreatedAgoText(),
            refereedBy: responseFactory.getReferees(),
            messageTargets: responseFactory.getMessageTargets()
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

  public async endGame(gameData: { gameDto: EndGameDto; requestDto: RequestDtoType }): Promise<Response<EndGameReport>> {
    try {
      // build the requester
      const requester: Requester = RequesterFactory.initialize(gameData.requestDto);
      if (!requester) throw new RequesterFactoryInitializationError(this.constructor.name, this.endGame.name);

      // get/create the user ending the game
      const creatorResult = await requester.getOrCreateUser();
      if (creatorResult.failed()) {
        if (creatorResult.value.error) throw creatorResult.value.error;
        Log.methodFailure(this.endGame, this.constructor.name, creatorResult.value.reason);
        return {
          success: false,
          message: FailureMessage.get("gameEndFailed"),
          errors: {
            messages: [creatorResult.value.reason],
            validation: creatorResult.value.validationErrors
          }
        };
      }

      // try to end the game
      const endGameResult = await this.gameService.endGame({
        gameDto: gameData.gameDto,
        endedByUser: creatorResult.value
      });
      if (endGameResult.failed()) {
        if (endGameResult.value.error) throw endGameResult.value.error;
        Log.methodFailure(this.endGame, this.constructor.name, endGameResult.value.reason);
        return {
          success: false,
          message: FailureMessage.get("gameEndFailed"),
          errors: {
            messages: [endGameResult.value.reason],
            validation: endGameResult.value.validationErrors
          }
        };
      }

      const game: Game = endGameResult.value;
      Log.methodSuccess(this.endGame, this.constructor.name);
      return {
        success: true,
        message: Message.get("gameEndSuccess"),
        result: ((): EndGameReport => {
          const gameResponseFactory = new GameResponseFactory(requester, game, gameData.requestDto);
          return {
            gameId: game.id,
            endedBy: gameResponseFactory.getEndedBy(),
            endedAgo: gameResponseFactory.getEndedAgoText()
          };
        })()
      };
    } catch (error) {
      Log.methodError(this.endGame, this.constructor.name, error);
      return {
        success: false,
        message: FailureMessage.get("gameEndFailed"),
        errors: {
          messages: [error]
        }
      };
    }
  }

  public async update(gameData: { gameDto: UpdateGameDto; requestDto: RequestDtoType }): Promise<Response<UpdateGameReport>> {
    try {
      // build the requester
      const requester: Requester = RequesterFactory.initialize(gameData.requestDto);
      if (!requester) throw new RequesterFactoryInitializationError(this.constructor.name, this.create.name);

      // get/create the user updating the game
      const creatorResult = await requester.getOrCreateUser();
      if (creatorResult.failed()) {
        if (creatorResult.value.error) throw creatorResult.value.error;
        Log.methodFailure(this.update, this.constructor.name, creatorResult.value.reason);
        return {
          success: false,
          message: FailureMessage.get("gameUpdateFailed"),
          errors: {
            messages: [creatorResult.value.reason],
            validation: creatorResult.value.validationErrors
          }
        };
      }

      // TODO: permissions check on creatorResult user

      // create and save the game
      const updateGameResult = await this.gameService.updateGame(gameData.gameDto, gameData.requestDto);
      if (updateGameResult.failed()) {
        if (updateGameResult.value.error) throw updateGameResult.value.error;
        Log.methodFailure(this.update, this.constructor.name, updateGameResult.value.reason);
        return {
          success: false,
          message: FailureMessage.get("gameUpdateFailed"),
          errors: {
            messages: [updateGameResult.value.reason],
            validation: updateGameResult.value.validationErrors
          }
        };
      }

      // return new game creation success response
      const game: Game = updateGameResult.value;
      Log.methodSuccess(this.create, this.constructor.name);
      return {
        success: true,
        message: Message.get("gameUpdateSuccess"),
        result: ((): UpdateGameReport => {
          // TODO: Only include which properties were changed. Need to include an array of property names on the update-response for those props which were changed.
          const responseFactory = new GameResponseFactory(requester, game, gameData.requestDto);
          return {
            gameId: game.id,
            teamLives: game.teamLives,
            countFailedScores: game.countFailedScores,
            status: GameStatus.getTextFromKey(game.status),
            createdBy: responseFactory.getCreator(),
            createdAgo: responseFactory.getCreatedAgoText(),
            refereedBy: responseFactory.getReferees(),
            messageTargets: responseFactory.getMessageTargets()
          };
        })()
      };
    } catch (error) {
      Log.methodError(this.create, this.constructor.name, error);
      return {
        success: false,
        message: FailureMessage.get("gameUpdateFailed"),
        errors: {
          messages: [error]
        }
      };
    }
  }
}
