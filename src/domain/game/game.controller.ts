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
import { Permissions } from "../../permissions/permissions";
import { Right, Either } from "../../utils/Either";
import { Failure } from "../../utils/Failure";
import { UserFailureTypes } from "../user/user.failure";
import { User } from "../user/user.entity";
import { PermissionsFailure } from "../../permissions/permissions.failure";
import { CommunicationClientType } from "../../communication-types";

export class GameController {
  constructor(
    @inject(GameService) private readonly gameService: GameService,
    @inject(Permissions) private readonly permissions: Permissions
  ) {
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
      // build the requester
      const requester = RequesterFactory.initialize(gameData.requestDto);
      if (!requester) throw new RequesterFactoryInitializationError(this.constructor.name, this.endGame.name);

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

      // ensure game exists
      const targetGameResult = await this.gameService.findGameById(gameData.gameDto.gameId);
      if (targetGameResult.failed()) {
        Log.methodFailure(this.endGame, this.constructor.name, targetGameResult.value.reason);
        return {
          success: false,
          message: FailureMessage.get("gameUpdateFailed"),
          errors: {
            messages: [targetGameResult.value.reason]
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
        result: await (async (): Promise<UpdateGameReport> => {
          // TODO: Only include which properties were changed. Need to include an array of property names on the update-response for those props which were changed.
          const responseFactory = new GameResponseFactory(requester, game, gameData.requestDto);
          return {
            gameId: game.id,
            teamLives: game.teamLives,
            countFailedScores: game.countFailedScores,
            status: GameStatus.getTextFromKey(game.status),
            createdBy: responseFactory.getCreator(),
            createdAgo: responseFactory.getCreatedAgoText(),
            refereedBy: await responseFactory.getReferees(),
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
