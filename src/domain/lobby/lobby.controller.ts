import iocContainer from "../../inversify.config";
import { TYPES } from "../../types";
import { AddLobbyDto } from "./dto/add-lobby.dto";
import { RequestDtoType } from "../../requests/dto/request.dto";
import { Response } from "../../requests/response";
import { Lobby } from "./lobby.entity";
import { LobbyService } from "./lobby.service";
import { Log } from "../../utils/log";
import { RequesterFactory } from "../../requests/requester-factory";
import { User } from "../user/user.entity";
import { FailureMessage, Message } from "../../utils/message";
import { AddLobbyReport } from "./reports/add-lobby.report";
import { LobbyResponseFactory } from "./lobby-response-factory";
import { LobbyStatus } from "./lobby-status";
import { RemoveLobbyDto } from "./dto/remove-lobby.dto";
import { RemoveLobbyReport } from "./reports/remove-lobby.report";
import { RemovedLobbyResult } from "./removed-lobby-result";
import { RemovedLobbyResponseFactory } from "./removed-lobby-response-factory";
import { injectable, inject } from "inversify";

@injectable()
export class LobbyController {
  constructor(
    @inject(TYPES.LobbyService) private lobbyService: LobbyService,
    @inject(TYPES.RequesterFactory) private requesterFactory: RequesterFactory
  ) {
    Log.info(`Initialized ${this.constructor.name}.`);
  }

  /**
   * Creates a new lobby and starts the scanner for multiplayer match results.
   *
   * If game ID is unspecified, the lobby is added to the most recent game created by the user.
   *
   * If a lobby already exists with the specified Bancho multiplayer ID,
   * try to associate the existing lobby with the given game ID
   *
   * @param {{ lobbyData: AddLobbyDto; requestDto: RequestDtoType }} lobbyData
   * @returns {Promise<Response<AddLobbyReport>>}
   */
  public async create(lobbyData: { lobbyDto: AddLobbyDto; requestDto: RequestDtoType }): Promise<Response<AddLobbyReport>> {
    try {
      const requester = this.requesterFactory.create(lobbyData.requestDto);

      // get/create the user adding the lobby
      const creatorResult = await requester.getOrCreateUser();
      if (creatorResult.failed()) {
        const failure = creatorResult.value;
        if (failure.error) throw failure.error;
        Log.methodFailure(this.create, this.constructor.name, failure.reason);
        return {
          success: false,
          message: FailureMessage.get("lobbyCreateFailed"),
          errors: {
            messages: [failure.reason],
            validation: failure.validationErrors
          }
        };
      }
      const lobbyCreator: User = creatorResult.value;

      // create and save the lobby
      const savedLobbyResult = await this.lobbyService.processAddLobbyRequest(lobbyData.lobbyDto, lobbyCreator.id);
      if (savedLobbyResult.failed()) {
        const failure = savedLobbyResult.value;
        if (failure.error) throw failure.error;
        Log.methodFailure(this.create, this.constructor.name, failure.reason);
        return {
          success: false,
          message: FailureMessage.get("lobbyCreateFailed"),
          errors: {
            messages: [failure.reason],
            validation: failure.validationErrors
          }
        };
      }

      // return lobby creation success response
      const savedLobby: Lobby = savedLobbyResult.value;
      Log.methodSuccess(this.create, this.constructor.name);
      return {
        success: true,
        message: Message.get("lobbyCreateSuccess"),
        result: ((): AddLobbyReport => {
          const responseFactory = new LobbyResponseFactory(requester, savedLobby, lobbyData.requestDto);
          return {
            addedAgo: responseFactory.getAddedAgoText(),
            addedBy: responseFactory.getAddedBy(),
            gameId: responseFactory.getGameId(),
            multiplayerId: savedLobby.banchoMultiplayerId,
            // GL: startAtMapNumber: savedLobby.startingMapNumber,
            startAtMapNumber: savedLobby.gameLobbies.find(gameLobby => gameLobby.lobby.id == savedLobby.id).startingMapNumber,
            status: LobbyStatus.getTextFromKey(savedLobby.status)
          };
        })()
      };
    } catch (error) {
      Log.methodError(this.create, this.constructor.name, error);
      return {
        success: false,
        message: FailureMessage.get("lobbyCreateFailed"),
        errors: {
          messages: [error]
        }
      };
    }
  }

  public async remove(lobbyData: { lobbyDto: RemoveLobbyDto; requestDto: RequestDtoType }): Promise<Response<RemoveLobbyReport>> {
    try {
      const requester = this.requesterFactory.create(lobbyData.requestDto);

      // get/create the user removing the lobby
      const requesterUserResult = await requester.getOrCreateUser();
      if (requesterUserResult.failed()) {
        const failure = requesterUserResult.value;
        if (failure.error) throw failure.error;
        Log.methodFailure(this.remove, this.constructor.name, failure.reason);
        return {
          success: false,
          message: FailureMessage.get("lobbyRemoveFailed"),
          errors: {
            messages: [failure.reason],
            validation: failure.validationErrors
          }
        };
      }
      const lobbyRemover: User = requesterUserResult.value;

      // attempt to remove the lobby
      const removedLobbyResult = await this.lobbyService.processRemoveLobbyRequest(lobbyData.lobbyDto, lobbyRemover.id);
      if (removedLobbyResult.failed()) {
        const failure = removedLobbyResult.value;
        if (failure.error) throw failure.error;
        Log.methodFailure(this.remove, this.constructor.name, failure.reason);
        return {
          success: false,
          message: FailureMessage.get("lobbyRemoveFailed"),
          errors: {
            messages: [failure.reason],
            validation: failure.validationErrors
          }
        };
      }

      // return lobby removal success response
      const removedLobbyData: RemovedLobbyResult = removedLobbyResult.value;
      Log.methodSuccess(this.create, this.constructor.name);
      return {
        success: true,
        message: Message.get("lobbyRemoveSuccess"),
        result: ((): RemoveLobbyReport => {
          const responseFactory = new RemovedLobbyResponseFactory(requester, removedLobbyData, lobbyData.requestDto);
          return {
            removedAgo: responseFactory.getRemovedAgoText(),
            removedBy: responseFactory.getRemovedBy(),
            gameIdRemovedFrom: responseFactory.getGameId(),
            multiplayerId: removedLobbyData.lobby.banchoMultiplayerId,
            status: LobbyStatus.getTextFromKey(removedLobbyData.lobby.status)
          };
        })()
      };
    } catch (error) {
      Log.methodError(this.create, this.constructor.name, error);
      return {
        success: false,
        message: FailureMessage.get("lobbyRemoveFailed"),
        errors: {
          messages: [error]
        }
      };
    }
  }
}
