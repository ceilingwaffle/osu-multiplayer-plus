import { AddLobbyDto } from "./dto/add-lobby.dto";
import { RequestDtoType } from "../../requests/dto/request.dto";
import { Response } from "../../requests/Response";
import { Lobby } from "./lobby.entity";
import { LobbyService } from "./lobby.service";
import { inject } from "inversify";
import { Log } from "../../utils/Log";
import { Requester } from "../../requests/requesters/requester";
import { RequesterFactory } from "../../requests/requester-factory";
import { RequesterFactoryInitializationError } from "../shared/errors/RequesterFactoryInitializationError";
import { User } from "../user/user.entity";
import { FailureMessage, Message } from "../../utils/message";

export class LobbyController {
  constructor(@inject(LobbyService) private readonly lobbyService: LobbyService) {
    Log.debug("Initialized Lobby Controller.");
  }

  public async create(request: { lobbyData: AddLobbyDto; requestDto: RequestDtoType }): Promise<Response<Lobby>> {
    try {
      // build the requester
      const requester: Requester = RequesterFactory.initialize(request.requestDto);
      if (!requester) throw new RequesterFactoryInitializationError(this.constructor.name, this.create.name);

      // get/create the user adding the lobby
      const creatorResult = await requester.getOrCreateUser();
      if (creatorResult.failed()) {
        if (creatorResult.value.error) throw creatorResult.value.error;
        Log.methodFailure(this.create, this.constructor.name, creatorResult.value.reason);
        return {
          success: false,
          message: FailureMessage.get("lobbyCreateFailed", creatorResult.value.reason)
        };
      }
      const lobbyCreator: User = creatorResult.value;

      // create and save the lobby
      const savedLobbyResult = await this.lobbyService.createAndSaveLobby(request.lobbyData, lobbyCreator.id, request.lobbyData.gameId);
      if (savedLobbyResult.failed()) {
        if (savedLobbyResult.value.error) throw savedLobbyResult.value.error;
        Log.methodFailure(this.create, this.constructor.name, savedLobbyResult.value.reason);
        return {
          success: false,
          message: FailureMessage.get("lobbyCreateFailed", savedLobbyResult.value.reason)
        };
      }

      // return lobby creation success response
      const savedLobby: Lobby = savedLobbyResult.value;
      Log.methodSuccess(this.create, this.constructor.name);
      return {
        success: true,
        message: Message.get("lobbyCreateSuccess"),
        result: savedLobby
      };
    } catch (error) {
      Log.methodError(this.create, this.constructor.name, error);
      return {
        success: false,
        message: FailureMessage.get("lobbyCreateFailed", error)
      };
    }
  }
}
