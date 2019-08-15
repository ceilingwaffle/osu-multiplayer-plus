import { LobbyRepository } from "./lobby.repository";
import { getCustomRepository } from "typeorm";
import { Either } from "../../utils/Either";
import { Failure } from "../../utils/Failure";
import { AddLobbyDto } from "./dto/add-lobby.dto";
import { Lobby } from "./lobby.entity";
import { LobbyStatus } from "./lobby-status";
import { User } from "../user/user.entity";
import { Game } from "../game/game.entity";
import { GameFailure } from "../game/game.failure";
import { UserFailure } from "../user/user.failure";
import { LobbyFailure, invalidLobbyCreationArgumentsFailure } from "./lobby.failure";
import { GameService } from "../game/game.service";
import { inject } from "inversify";
import { Log } from "../../utils/Log";
import { failurePromise, successPromise } from "../../utils/either";
import { UserService } from "../user/user.service";
import { validate } from "class-validator";

export class LobbyService {
  private readonly lobbyRepository: LobbyRepository = getCustomRepository(LobbyRepository);

  constructor(
    @inject(GameService) private readonly gameService: GameService,
    @inject(UserService) private readonly userService: UserService
  ) {
    Log.debug("Initialized Lobby Service.");
  }

  /**
   * Createes and returns an un-saved Lobby entity.
   *
   * @param {AddLobbyDto} lobbyData The lobby properties.
   * @param {User} [createdBy] The lobby creator.
   * @param {Game[]} [games] The games this lobby is associated with.
   * @returns {Lobby} The created Lobby.
   */
  public create(lobbyData: AddLobbyDto, createdBy?: User, games?: Game[]): Lobby {
    const lobby = new Lobby();

    lobby.addedBy = createdBy;
    lobby.banchoMultiplayerId = lobbyData.banchoMultiplayerId;
    lobby.status = LobbyStatus.AWAITING_FIRST_SCAN.getKey();
    lobby.games = games || [];

    return lobby;
  }

  /**
   * Saves a lobby in the database.
   *
   * @param {Lobby} lobby
   * @returns {Promise<Lobby>}
   */
  public async save(lobby: Lobby): Promise<Lobby> {
    return await this.lobbyRepository.save(lobby);
  }

  /**
   * Creates and saves a lobby. If no [gameId] provided, saves the lobby
   * on the game most recently created by the user with user ID [userId].
   *
   * @param {AddLobbyDto} lobbyData
   * @param {number} userId Lobby creator user ID
   * @param {number} [gameId]
   * @returns {(Promise<Either<Failure<GameFailure | UserFailure | LobbyFailure>, Lobby>>)}
   */
  public async createAndSaveLobby(
    lobbyData: AddLobbyDto,
    userId: number,
    gameId?: number
  ): Promise<Either<Failure<LobbyFailure | GameFailure | UserFailure>, Lobby>> {
    try {
      // create lobby without entity-relationships so we can validate the props
      const lobby: Lobby = this.create(lobbyData);
      const lobbyValidationErrors = await validate(lobby);
      if (lobbyValidationErrors.length > 0) {
        Log.methodFailure(
          this.create,
          this.constructor.name,
          "Lobby properties validation failed: " + lobbyValidationErrors.toLocaleString()
        );
        return failurePromise(invalidLobbyCreationArgumentsFailure(lobbyValidationErrors));
      }

      // if a game ID was not provided, get the most recent game created by the user ID (lobby creator)
      const lobbyGameResult: Either<Failure<GameFailure>, Game> = gameId
        ? await this.gameService.findGameById(gameId)
        : await this.gameService.findMostRecentGameCreatedByUser(userId);

      if (lobbyGameResult.failed()) {
        Log.methodFailure(this.create, this.constructor.name, lobbyGameResult.value.reason, lobbyGameResult.value.error);
        return failurePromise(lobbyGameResult.value);
      }

      // get the lobby creator
      const lobbyCreatorResult: Either<Failure<UserFailure>, User> = await this.userService.findOne({ id: userId });
      if (lobbyCreatorResult.failed()) {
        Log.methodFailure(this.create, this.constructor.name, lobbyCreatorResult.value.reason, lobbyCreatorResult.value.error);
        return failurePromise(lobbyCreatorResult.value);
      }

      // add game and lobby creator to lobby
      lobby.games.push(lobbyGameResult.value);
      lobby.addedBy = lobbyCreatorResult.value;

      // save lobby
      const savedLobby: Lobby = await this.lobbyRepository.save(lobby);

      // start the lobby watcher

      return successPromise(savedLobby);
    } catch (error) {
      Log.methodError(this.createAndSaveLobby, this.constructor.name, error);
      throw error;
    }
  }

  //   public async startLobbyScanner(lobbyData: AddLobbyDto, requestData: RequestDto): Promise<Either<Failure<LobbyFailure>, Lobby>> {
  //     throw new Error("Method not implemented.");

  //     // validate bancho multiplayer exists

  //     // validate bancho multiplayer is not closed/inactive

  //     // save lobby in DB

  //     // start lobby scanner
  //   }
}
