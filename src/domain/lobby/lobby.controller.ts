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
import { validate } from "class-validator";
import { User } from "../user/user.entity";
import { FailureMessage } from "../../utils/message";
import { GameService } from "../game/game.service";
import { Game } from "../game/game.entity";

export class LobbyController {
  constructor(
    @inject(LobbyService) private readonly lobbyService: LobbyService,
    @inject(GameService) private readonly gameService: GameService
  ) {
    Log.debug("Initialized Lobby Service.");
  }

  async create(request: { lobbyData: AddLobbyDto; requestDto: RequestDtoType }): Promise<Response<Lobby>> {
    // throw new Error("Method not implemented.");

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

      // get the game for the lobby
      const lobbyGame: Game = request.lobbyData.gameId
        ? await this.gameService.findGameById(request.lobbyData.gameId)
        : await this.gameService.findMostRecentGameCreatedByUser(lobbyCreator.id);

      if (!lobbyGame) {
        const failureReason = `Game ID ${request.lobbyData.gameId} does not exist.`;
        Log.methodFailure(this.create, this.constructor.name, failureReason);
        return {
          success: false,
          message: FailureMessage.get("lobbyCreateFailed", failureReason)
        };
      }

      // create the lobby
      const lobby: Lobby = this.lobbyService.create(request.lobbyData, lobbyCreator, [lobbyGame]);
      const errors = await validate(lobby);
      if (errors.length > 0) {
        // TODO: Handle validation in a more DRY way across controllers
        const failureReason = "Lobby properties validation failed. " + errors.toLocaleString();
        Log.methodFailure(this.create, this.constructor.name, failureReason);
        return {
          success: false,
          message: FailureMessage.get("lobbyCreateFailed", failureReason)
        };
      }

      // save lobby
      const savedLobby: Lobby = this.lobbyService.save(lobby);
    } catch (error) {}
  }
}
