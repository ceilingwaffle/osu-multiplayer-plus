import { TYPES } from "../../types";
import { inject, injectable } from "inversify";
import { GameService } from "./game.service";
import { CreateGameDto } from "./dto/index";
import { RequesterFactory } from "../../requests/requester-factory";
import { Response } from "../../requests/response";
import { Game } from "./game.entity";
import { Message, FailureMessage } from "../../utils/message";
import { RequestDtoType } from "../../requests/dto/request.dto";
import { Log } from "../../utils/log";
import { UpdateGameReport } from "./reports/update-game.report";
import { GameResponseFactory } from "./game-response-factory";
import { GameStatus } from "./game-status";
import { EndGameDto } from "./dto/end-game.dto";
import { EndGameReport } from "./reports/end-game.report";
import { UpdateGameDto } from "./dto/update-game.dto";
import { Permissions } from "../../permissions/permissions";
import { StartGameReport } from "./reports/start-game.report";
import { StartGameDto } from "./dto/start-game.dto";

@injectable()
export class GameController {
  constructor(
    @inject(TYPES.GameService) protected gameService: GameService,
    @inject(TYPES.Permissions) protected permissions: Permissions,
    @inject(TYPES.RequesterFactory) protected requesterFactory: RequesterFactory
  ) {
    Log.info(`Initialized ${this.constructor.name}.`);
  }

  /**
   * Creates a new game.
   *
   * @param {{ gameDto: CreateGameDto; requestDto: RequestDtoType }} gameData
   * @returns {Promise<Response<UpdateGameReport>>}
   */
  public async create(gameData: { gameDto: CreateGameDto; requestDto: RequestDtoType }): Promise<Response<UpdateGameReport>> {
    try {
      const requester = this.requesterFactory.create(gameData.requestDto);

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

      // skip permissions check - everyone is allowed to create a game

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

  public async endGame(gameData: { endGameDto: EndGameDto; requestDto: RequestDtoType }): Promise<Response<EndGameReport>> {
    try {
      const requester = this.requesterFactory.create(gameData.requestDto);

      // get/create the user ending the game
      const userResult = await requester.getOrCreateUser();
      if (userResult.failed()) {
        if (userResult.value.error) throw userResult.value.error;
        Log.methodFailure(this.endGame, this.constructor.name, userResult.value.reason);
        return {
          success: false,
          message: FailureMessage.get("gameEndFailed"),
          errors: {
            messages: [userResult.value.reason],
            validation: userResult.value.validationErrors
          }
        };
      }
      const requestingUser = userResult.value;

      // ensure game exists
      const targetGameResult = await this.gameService.findGameById(gameData.endGameDto.gameId);
      if (targetGameResult.failed()) {
        Log.methodFailure(this.endGame, this.constructor.name, targetGameResult.value.reason);
        return {
          success: false,
          message: FailureMessage.get("gameEndFailed"),
          errors: {
            messages: [targetGameResult.value.reason],
            validation: targetGameResult.value.validationErrors
          }
        };
      }

      // check if user is permitted to end the game
      const userRole = await this.gameService.getUserRoleForGame(requestingUser.id, gameData.endGameDto.gameId);
      const userPermittedResult = await this.permissions.checkUserPermission({
        user: requestingUser,
        userRole: userRole,
        action: "end",
        resource: "game",
        entityId: gameData.endGameDto.gameId,
        requesterClientType: requester.dto.commType
      });
      if (userPermittedResult.failed()) {
        Log.methodFailure(this.endGame, this.constructor.name, `User ${requestingUser.id} does not have permission.`);
        return {
          success: false,
          message: FailureMessage.get("gameEndFailed"),
          errors: {
            messages: [userPermittedResult.value.reason]
          }
        };
      }

      // try to end the game
      const endGameResult = await this.gameService.endGame({
        gameDto: gameData.endGameDto,
        endedByUser: userResult.value
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

      // the game was ended successfully
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

  public async update(gameData: { updateGameDto: UpdateGameDto; requestDto: RequestDtoType }): Promise<Response<UpdateGameReport>> {
    try {
      const requester = this.requesterFactory.create(gameData.requestDto);

      // get/create the user updating the game
      const requestingUserResult = await requester.getOrCreateUser();
      if (requestingUserResult.failed()) {
        if (requestingUserResult.value.error) throw requestingUserResult.value.error;
        Log.methodFailure(this.update, this.constructor.name, requestingUserResult.value.reason);
        return {
          success: false,
          message: FailureMessage.get("gameUpdateFailed"),
          errors: {
            messages: [requestingUserResult.value.reason],
            validation: requestingUserResult.value.validationErrors
          }
        };
      }
      const requestingUser = requestingUserResult.value;

      // update and save the game
      const updateGameResult = await this.gameService.updateGame(gameData.updateGameDto, requestingUser, gameData.requestDto.commType);
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

      // return new game update success response
      const game: Game = updateGameResult.value;
      Log.methodSuccess(this.update, this.constructor.name);
      return {
        success: true,
        message: Message.get("gameUpdateSuccess"),
        // result: await (async (): Promise<UpdateGameReport> => {
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
      Log.methodError(this.update, this.constructor.name, error);
      return {
        success: false,
        message: FailureMessage.get("gameUpdateFailed"),
        errors: {
          messages: [error]
        }
      };
    }
  }

  async startGame(gameData: { startGameDto: StartGameDto; requestDto: RequestDtoType }): Promise<Response<StartGameReport>> {
    try {
      const requester = this.requesterFactory.create(gameData.requestDto);

      // get/create the user starting the game
      const userResult = await requester.getOrCreateUser();
      if (userResult.failed()) {
        if (userResult.value.error) throw userResult.value.error;
        Log.methodFailure(this.startGame, this.constructor.name, userResult.value.reason);
        return {
          success: false,
          message: FailureMessage.get("gameStartFailed"),
          errors: {
            messages: [userResult.value.reason],
            validation: userResult.value.validationErrors
          }
        };
      }
      const requestingUser = userResult.value;

      // ensure game exists
      const targetGameResult = await this.gameService.findGameById(gameData.startGameDto.gameId);
      if (targetGameResult.failed()) {
        Log.methodFailure(this.startGame, this.constructor.name, targetGameResult.value.reason);
        return {
          success: false,
          message: FailureMessage.get("gameStartFailed"),
          errors: {
            messages: [targetGameResult.value.reason],
            validation: targetGameResult.value.validationErrors
          }
        };
      }

      // check if user is permitted to start the game
      const userRole = await this.gameService.getUserRoleForGame(requestingUser.id, gameData.startGameDto.gameId);
      const userPermittedResult = await this.permissions.checkUserPermission({
        user: requestingUser,
        userRole: userRole,
        action: "start",
        resource: "game",
        entityId: gameData.startGameDto.gameId,
        requesterClientType: requester.dto.commType
      });
      if (userPermittedResult.failed()) {
        Log.methodFailure(
          this.startGame,
          this.constructor.name,
          `User ${requestingUser.id} does not have permission to start game ${targetGameResult.value.id}.`,
          userPermittedResult.value.reason
        );
        return {
          success: false,
          message: FailureMessage.get("gameStartFailed"),
          errors: {
            messages: [userPermittedResult.value.reason]
          }
        };
      }

      // try to start the game
      const startGameResult = await this.gameService.startGame({ gameDto: gameData.startGameDto, startedByUser: requestingUser });
      if (startGameResult.failed()) {
        Log.methodFailure(this.startGame, this.constructor.name, startGameResult.value.reason);
        return {
          success: false,
          message: FailureMessage.get("gameStartFailed"),
          errors: {
            messages: [startGameResult.value.reason],
            validation: startGameResult.value.validationErrors
          }
        };
      }

      // the game was started successfully
      const startedGame: Game = startGameResult.value;
      Log.methodSuccess(this.startGame, this.constructor.name);
      return {
        success: true,
        message: Message.get("gameStartSuccess"),
        result: ((): StartGameReport => {
          const gameResponseFactory = new GameResponseFactory(requester, startedGame, gameData.requestDto);
          return {
            gameId: startedGame.id,
            startedBy: gameResponseFactory.getStartedBy(),
            startedAgo: gameResponseFactory.getStartedAgoText()
          };
        })()
      };
    } catch (error) {
      Log.methodError(this.startGame, this.constructor.name, error);
      return {
        success: false,
        message: FailureMessage.get("gameStartFailed"),
        errors: {
          messages: [error]
        }
      };
    }
  }
}
