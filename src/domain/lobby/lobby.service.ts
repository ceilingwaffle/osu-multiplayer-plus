import { IOsuLobbyScanner } from "../../osu/interfaces/osu-lobby-scanner";
import { LobbyRepository } from "./lobby.repository";
import { getCustomRepository } from "typeorm";
import { Either, success } from "../../utils/Either";
import { Failure } from "../../utils/Failure";
import { AddLobbyDto } from "./dto/add-lobby.dto";
import { Lobby } from "./lobby.entity";
import { LobbyStatus } from "./lobby-status";
import { User } from "../user/user.entity";
import { Game } from "../game/game.entity";
import { GameFailure } from "../game/game.failure";
import { UserFailure } from "../user/user.failure";
import {
  LobbyFailure,
  invalidLobbyCreationArgumentsFailure,
  banchoMultiplayerIdAlreadyAssociatedWithGameFailure,
  lobbyCreationFailure,
  lobbyDoesNotExistFailure,
  lobbyRemovalFailure
} from "./lobby.failure";
import { GameService } from "../game/game.service";
import { inject } from "inversify";
import { Log } from "../../utils/Log";
import { failurePromise, successPromise } from "../../utils/either";
import { UserService } from "../user/user.service";
import { validate } from "class-validator";
import { GameRepository } from "../game/game.repository";
import { GameStatus } from "../game/game-status";
import { RemoveLobbyDto } from "./dto/remove-lobby.dto";
import { Helpers } from "../../utils/helpers";
import { RemovedLobbyResult } from "./removed-lobby-result";
import { TYPES } from "../../types";

export class LobbyService {
  private readonly lobbyRepository: LobbyRepository = getCustomRepository(LobbyRepository);
  private readonly gameRepository: GameRepository = getCustomRepository(GameRepository);

  constructor(
    @inject(GameService) private readonly gameService: GameService,
    @inject(UserService) private readonly userService: UserService,
    @inject(TYPES.IOsuLobbyScanner) private readonly osuLobbyScanner: IOsuLobbyScanner
  ) {
    Log.info("Initialized Lobby Service.");
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
    lobby.startingMapNumber = lobbyData.startAtMap > 1 ? lobbyData.startAtMap : 1;

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
   * Creates and saves a lobby. If no gameId provided on the DTO, saves the lobby
   * on the game most recently created by the user with user ID [userId].
   *
   * @param {AddLobbyDto} lobbyData
   * @param {number} userId
   * @returns {(Promise<Either<Failure<LobbyFailure | GameFailure | UserFailure>, Lobby>>)}
   * @memberof LobbyService
   */
  public async processAddLobbyRequest(
    lobbyData: AddLobbyDto,
    userId: number
  ): Promise<Either<Failure<LobbyFailure | GameFailure | UserFailure>, Lobby>> {
    try {
      // create lobby without entity-relationships so we can validate the props
      const lobby: Lobby = this.create(lobbyData);
      const lobbyValidationErrors = await validate(lobby);
      if (lobbyValidationErrors.length > 0) {
        Log.methodFailure(
          this.processAddLobbyRequest,
          this.constructor.name,
          "Lobby properties validation failed: " + lobbyValidationErrors.toLocaleString()
        );
        return failurePromise(invalidLobbyCreationArgumentsFailure(lobbyValidationErrors));
      }

      const foundGameResult: Either<Failure<GameFailure>, Game> = await this.getRequestingUserTargetGame(lobbyData, userId);
      if (foundGameResult.failed()) {
        // no game exists created by the user, or no game exists for the provided game ID
        Log.methodFailure(this.processAddLobbyRequest, this.constructor.name, foundGameResult.value.reason, foundGameResult.value.error);
        return failurePromise(foundGameResult.value);
      }

      // fail to add lobby on a closed-game
      if (GameStatus.isEndedStatus(foundGameResult.value.status)) {
        const gameId = foundGameResult.value.id;
        const gameStatus = GameStatus.getTextFromKey(foundGameResult.value.status);
        const failureReason = `A lobby cannot be added to game ID ${gameId} because it has a status of ${gameStatus}. Try re-opening the game or creating a new one.`;
        Log.methodFailure(this.processAddLobbyRequest, this.constructor.name, failureReason);
        return failurePromise(lobbyCreationFailure(failureReason));
      }

      const alreadyUsingBanchoMpId = await this.isGameUsingBanchoMultiplayerId(lobbyData.banchoMultiplayerId, foundGameResult.value.id);
      if (alreadyUsingBanchoMpId) {
        const failure = banchoMultiplayerIdAlreadyAssociatedWithGameFailure(lobbyData.banchoMultiplayerId, foundGameResult.value.id);
        Log.methodFailure(this.processAddLobbyRequest, this.constructor.name, failure.reason);
        return failurePromise(failure);
      }

      // get the lobby creator
      const lobbyCreatorResult: Either<Failure<UserFailure>, User> = await this.userService.findOne({ id: userId });
      if (lobbyCreatorResult.failed()) {
        Log.methodFailure(
          this.processAddLobbyRequest,
          this.constructor.name,
          lobbyCreatorResult.value.reason,
          lobbyCreatorResult.value.error
        );
        return failurePromise(lobbyCreatorResult.value);
      }

      const builtLobbyResult = await this.saveLobbyWithRelations(lobby, foundGameResult.value, lobbyCreatorResult.value);
      if (builtLobbyResult.failed()) {
        Log.methodFailure(this.processAddLobbyRequest, this.constructor.name, builtLobbyResult.value.reason, builtLobbyResult.value.error);
        return failurePromise(builtLobbyResult.value);
      }

      const builtLobby = builtLobbyResult.value;

      const lobbyGame = this.getSingleGameOfLobby(builtLobbyResult.value);
      if (!lobbyGame) {
        throw new Error("The lobby was saved without being associated with a game. This should never happen.");
      }

      // start the lobby watcher
      // TODO: Wrap this in a failure check - e.g what if the osu api is down? Should have some max time limit to try to start the watcher, and return a failure if it fails to start within that time.
      this.osuLobbyScanner.watch(lobbyGame.id, lobbyData.banchoMultiplayerId);
      // this.lobbyWatcher.watch({ banchoMultiplayerId: lobbyData.banchoMultiplayerId, gameId: lobbyGame.id });

      // We only want the game we just retrieved, not any other games that may have been previously added this lobby.
      // This ensures that the game data we're returning is definitely of the game we expect it to be.
      builtLobby.games = [foundGameResult.value];

      return successPromise(builtLobby);
    } catch (error) {
      Log.methodError(this.processAddLobbyRequest, this.constructor.name, error);
      throw error;
    }
  }

  public async processRemoveLobbyRequest(
    lobbyData: RemoveLobbyDto,
    userId: number
  ): Promise<Either<Failure<LobbyFailure | GameFailure | UserFailure>, RemovedLobbyResult>> {
    try {
      const targetLobby = await this.lobbyRepository.findOne(
        { banchoMultiplayerId: lobbyData.banchoMultiplayerId },
        { relations: ["games"] }
      );
      if (!targetLobby) {
        const failureMessage = `A lobby has not been added for multiplayer ID ${lobbyData.banchoMultiplayerId}.`;
        Log.methodFailure(this.processRemoveLobbyRequest, this.constructor.name, failureMessage);
        return failurePromise(lobbyDoesNotExistFailure(failureMessage));
      }

      // get the lobby remover
      const lobbyRemoverResult: Either<Failure<UserFailure>, User> = await this.userService.findOne({ id: userId });
      if (lobbyRemoverResult.failed()) {
        Log.methodFailure(
          this.processRemoveLobbyRequest,
          this.constructor.name,
          lobbyRemoverResult.value.reason,
          lobbyRemoverResult.value.error
        );
        return failurePromise(lobbyRemoverResult.value);
      }
      const lobbyRemover = lobbyRemoverResult.value;
      this.setRemovalPropertiesOnLobby(targetLobby, lobbyRemover);

      // if the requester did not specify a target-game-id, try to use their most-recently created game
      const foundGameResult: Either<Failure<GameFailure>, Game> = await this.getRequestingUserTargetGame(lobbyData, userId);
      if (foundGameResult.failed()) {
        // no game exists created by the user, or no game exists for the provided game ID
        Log.methodFailure(this.processRemoveLobbyRequest, this.constructor.name, foundGameResult.value.reason, foundGameResult.value.error);
        return failurePromise(foundGameResult.value);
      }
      const gameId = foundGameResult.value.id;

      // Remove the target game from the lobby.games array
      const removedGame: Game = gameId ? this.extractGameFromLobbyGames(targetLobby, gameId) : null;
      if (!removedGame) {
        const failureReason = `Lobby ${targetLobby.banchoMultiplayerId} could not be removed because the lobby was not one of the lobbies of game ID ${gameId}.`;
        Log.methodFailure(this.processRemoveLobbyRequest, this.constructor.name);
        return failurePromise(lobbyRemovalFailure(failureReason));
      }

      // unwatch the bancho lobby if the lobby no longer belongs to any games
      if (targetLobby.games.length < 1) {
        this.osuLobbyScanner.unwatch(gameId, targetLobby.banchoMultiplayerId);
        // this.lobbyWatcher.unwatch({ banchoMultiplayerId: targetLobby.banchoMultiplayerId, gameId: gameId });
        // update the lobby status
        targetLobby.status = LobbyStatus.STOPPED_WATCHING.getKey();
      }

      const savedLobby = await this.saveAndReloadLobby(targetLobby, ["games", "removedBy", "removedBy.discordUser", "removedBy.webUser"]);
      // TODO: Decide to soft/hard delete depending on whether or not match-scores have been recorded for the lobby:
      // - if the lobby has some recorded matches, keep the lobby in the database
      // - if the lobby has no recorded matches, hard-delete the lobby from the database
      // - if the lobby has some recorded matches, refuse the lobby remove command

      const removedLobbyResult: RemovedLobbyResult = {
        gameIdRemovedFrom: removedGame.id,
        lobby: savedLobby
      };

      return successPromise(removedLobbyResult);
    } catch (error) {
      Log.methodError(this.processRemoveLobbyRequest, this.constructor.name, error);
      throw error;
    }
  }

  private setRemovalPropertiesOnLobby(targetLobby: Lobby, lobbyRemoveUser: User) {
    targetLobby.removedAt = Helpers.getNow();
    targetLobby.removedBy = lobbyRemoveUser;
  }

  /**
   * Removes a game from the given Lobby if one matches the given game ID, and returns the removed game.
   *
   * @private
   * @param {Lobby} lobby
   * @param {number} targetGameId
   * @returns {Game}
   * @memberof LobbyService
   */
  private extractGameFromLobbyGames(lobby: Lobby, targetGameId: number): Game {
    const games: Game[] = lobby.games.filter(lobbyGame => lobbyGame.id === targetGameId);
    if (!games.length) return null;
    const removedGame: Game = games[0];
    const i = lobby.games.indexOf(removedGame);
    lobby.games.splice(i, 1);
    return removedGame;
  }

  private async getRequestingUserTargetGame(lobbyData: AddLobbyDto, userId: number) {
    // Game ID will be provided as "-1" if none was given by the user at the boundary.
    let foundGameResult: Either<Failure<GameFailure>, Game>;
    if (!lobbyData.gameId || lobbyData.gameId < 0) {
      // If a game ID was not provided, get the most recent game created by the user ID (lobby creator).
      foundGameResult = await this.gameService.findMostRecentGameCreatedByUser(userId);
    } else {
      // Get the game targetted by the game ID provided in the request.
      foundGameResult = await this.gameService.findGameById(lobbyData.gameId);
    }
    return foundGameResult;
  }

  /**
   * Returns true if a game-lobby already exists for the given Bancho-multiplayer-id.
   *
   * @private
   * @param {string} banchoMultiplayerId
   * @param {number} gameId
   * @returns {Promise<Boolean>}
   */
  private async isGameUsingBanchoMultiplayerId(banchoMultiplayerId: string, gameId: number): Promise<Boolean> {
    try {
      const mpids = await this.getBanchoMultiplayerIdsForGame(gameId);
      const answer = mpids.includes(banchoMultiplayerId);
      Log.methodSuccess(this.isGameUsingBanchoMultiplayerId, this.constructor.name);
      return answer;
    } catch (error) {
      Log.methodError(this.isGameUsingBanchoMultiplayerId, this.constructor.name, error);
      throw error;
    }
  }

  /**
   * Saves a game and a user on a lobby. Updates and returns an existing Lobby
   * if one exists for the Bancho-MP-ID prop on the provided unsaved-Lobby.
   *
   * @param {Lobby} unsavedNewLobby
   * @param {Game} game
   * @param {User} creator
   * @returns {(Promise<Either<Failure<LobbyFailure | GameFailure | UserFailure>, Lobby>>)}
   */
  public async saveLobbyWithRelations(
    unsavedNewLobby: Lobby,
    game: Game,
    creator: User
  ): Promise<Either<Failure<LobbyFailure | GameFailure | UserFailure>, Lobby>> {
    try {
      // If a Lobby already exists with this MP ID, use that Lobby instead. This is to ensure the MP ID is always unique for all lobbies.
      // This means the "addedBy" is always set to the original lobby-adder, not necessarily the user performing this add-lobby-request.
      // This could have some weird side-effects e.g. if two users from two Discord servers add the same lobby to different games, the
      // Discord-message-reply will show for one user that the Lobby was added by the other user from the other server.
      let lobbyToSave: Lobby;
      const existingLobby = await Lobby.findOne({ banchoMultiplayerId: unsavedNewLobby.banchoMultiplayerId }, { relations: ["games"] });
      if (!existingLobby) {
        lobbyToSave = unsavedNewLobby;
        lobbyToSave.games = [game];
        lobbyToSave.addedBy = creator;
      } else {
        lobbyToSave = existingLobby;
        lobbyToSave.games.push(game);
      }

      // save and reload lobby
      const reloadedLobby: Lobby = await this.saveAndReloadLobby(lobbyToSave, [
        "games",
        "addedBy",
        "addedBy.discordUser",
        "addedBy.webUser"
      ]);

      return successPromise(reloadedLobby);
    } catch (error) {
      Log.methodError(this.saveLobbyWithRelations, this.constructor.name, error);
      throw error;
    }
  }

  private async saveAndReloadLobby(lobbyToSave: Lobby, relations: string[] = []) {
    const savedLobby: Lobby = await this.save(lobbyToSave);
    const reloadedLobby: Lobby = await this.lobbyRepository.findOne({ id: savedLobby.id }, { relations: relations });
    return reloadedLobby;
  }

  private getSingleGameOfLobby(lobby: Lobby): Game {
    return lobby.games.length ? lobby.games.slice(-1)[0] : null;
  }

  private async getBanchoMultiplayerIdsForGame(gameId: number): Promise<string[]> {
    const game = await this.gameRepository.findGameWithLobbies(gameId);
    if (!game.lobbies || !game.lobbies.length) {
      return [];
    }
    return game.lobbies.map(lobby => lobby.banchoMultiplayerId);
  }
}
