import { TYPES } from "../../types";
import { IOsuLobbyScanner, LobbyWatcherChanged } from "../../osu/interfaces/osu-lobby-scanner";
import { LobbyRepository } from "./lobby.repository";
import { getCustomRepository } from "typeorm";
import { Either, success } from "../../utils/either";
import { Failure } from "../../utils/failure";
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
import { inject, injectable } from "inversify";
import { Log } from "../../utils/log";
import { failurePromise, successPromise } from "../../utils/either";
import { UserService } from "../user/user.service";
import { validate } from "class-validator";
import { GameRepository } from "../game/game.repository";
import { GameStatus } from "../game/game-status";
import { RemoveLobbyDto } from "./dto/remove-lobby.dto";
import { Helpers } from "../../utils/helpers";
import { RemovedLobbyResult } from "./removed-lobby-result";
import { GameLobby } from "../game/game-lobby.entity";
import { invalidLobbyStatusFailure } from "./lobby.failure";

@injectable()
export class LobbyService {
  private readonly lobbyRepository: LobbyRepository = getCustomRepository(LobbyRepository);
  private readonly gameRepository: GameRepository = getCustomRepository(GameRepository);

  constructor(
    @inject(TYPES.GameService) private gameService: GameService,
    @inject(TYPES.UserService) private userService: UserService,
    @inject(TYPES.IOsuLobbyScanner) private readonly osuLobbyScanner: IOsuLobbyScanner
  ) {
    Log.info(`Initialized ${this.constructor.name}.`);
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
    lobby.gameLobbies = [];

    if (games) {
      for (const game of games) {
        const gameLobby = new GameLobby();
        gameLobby.game = game;
        gameLobby.lobby = lobby;
        gameLobby.addedBy = createdBy;
        gameLobby.startingMapNumber = this.getStartingMapNumberFromAddLobbyDto(lobbyData);
        lobby.gameLobbies.push(gameLobby);
      }
    }

    // GL: lobby.addedBy = createdBy;
    lobby.banchoMultiplayerId = lobbyData.banchoMultiplayerId;
    lobby.status = LobbyStatus.AWAITING_FIRST_SCAN.getKey();
    lobby.matches = [];
    // GL: lobby.games = games || [];
    // GL: lobby.startingMapNumber = lobbyData.startAtMap > 1 ? lobbyData.startAtMap : 1;

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

      // get the user's most-recent game created if no game ID was specified in the request
      const foundGameResult: Either<Failure<GameFailure>, Game> = await this.gameService.getRequestingUserTargetGame({
        userId: userId,
        gameId: lobbyData.gameId
      });
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

      const alreadyUsingBanchoMpId = await this.isGameUsingBanchoMultiplayerIdAndNotRemoved(
        lobbyData.banchoMultiplayerId,
        foundGameResult.value.id
      );
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

      // set the lobby status (in case the lobby was previously removed and has now been re-added)
      lobby.status = LobbyStatus.AWAITING_FIRST_SCAN.getKey();

      // save the lobby in the db
      const builtLobbyResult = await this.saveLobbyWithRelations(lobby, foundGameResult.value, lobbyCreatorResult.value, lobbyData);
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
      // TODO: Can we listen for events from the osu lobby scanner from within the Lobby entity class, and update the status automatically when something happens with the scanner e.g. error, lobby scanning stopped, lobby scanning started
      //    ^ This will mean that the lobby returned from this method will have a status of AWAITING_FIRST_SCAN (since we're not awaiting
      //      scanner.watch()) and the scanner will update the lobby status some ~300ms later after the scanner for that lobby starts/fails.

      // creates a lobby watcher if one does not already exist (watcher not started until !startgame command is used)
      await this.osuLobbyScanner.tryCreateWatcher({ gameId: lobbyGame.id, multiplayerId: lobbyData.banchoMultiplayerId });
      if (GameStatus.isStartedStatus(lobbyGame.status)) {
        // start the watcher if the game is started
        await this.osuLobbyScanner.tryActivateWatchers({ gameId: lobbyGame.id });
      }
      // We only want the game we just retrieved, not any other games that may have been previously added this lobby.
      // This ensures that the game data we're returning is definitely of the game we expect it to be.
      // GL: builtLobby.games = [foundGameResult.value];
      builtLobby.gameLobbies = [builtLobby.gameLobbies.find(gameLobby => gameLobby.game.id === foundGameResult.value.id)];

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
        { relations: ["gameLobbies", "gameLobbies.lobby", "gameLobbies.game"] }
      );
      if (!targetLobby) {
        const failureMessage = `A lobby has not been added for multiplayer ID ${lobbyData.banchoMultiplayerId}.`;
        Log.methodFailure(this.processRemoveLobbyRequest, this.constructor.name, failureMessage);
        return failurePromise(lobbyDoesNotExistFailure(failureMessage));
      }

      const initialLobbyStatus: LobbyStatus = LobbyStatus.getLobbyStatusFromKey(targetLobby.status);
      if (!initialLobbyStatus || !initialLobbyStatus.getKey().length) {
        Log.methodFailure(this.processRemoveLobbyRequest, this.constructor.name);
        return failurePromise(invalidLobbyStatusFailure());
      }

      // get the lobby remover
      const lobbyRemoverResult = await this.userService.findOne({ id: userId });
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

      // if the requester did not specify a target-game-id, try to use their most-recently created game
      const foundGameResult = await this.gameService.getRequestingUserTargetGame({ userId: userId, gameId: lobbyData.gameId });
      if (foundGameResult.failed()) {
        // no game exists created by the user, or no game exists for the provided game ID
        Log.methodFailure(this.processRemoveLobbyRequest, this.constructor.name, foundGameResult.value.reason, foundGameResult.value.error);
        return failurePromise(foundGameResult.value);
      }
      const gameId = foundGameResult.value.id;

      // we need the game being disassociated from the lobby
      const removingGameLobby = targetLobby.gameLobbies.find(gameLobby => gameLobby.game.id === gameId);
      if (!removingGameLobby || !removingGameLobby.game) {
        const failureReason = `Lobby ${targetLobby.banchoMultiplayerId} could not be removed because it was not a lobby of game ID ${gameId}.`;
        Log.methodFailure(this.processRemoveLobbyRequest, this.constructor.name);
        return failurePromise(lobbyRemovalFailure(failureReason));
      }
      const removingGame = removingGameLobby.game;

      // ensure that the game lobby is not already removed
      const removableGameLobby = targetLobby.gameLobbies.find(gameLobby => !gameLobby.removedAt && gameLobby.game.id === gameId);
      if (!removableGameLobby) {
        const failureReason = `Lobby with MP ID ${targetLobby.banchoMultiplayerId} has already been removed from game ID ${gameId}.`;
        Log.methodFailure(this.processRemoveLobbyRequest, this.constructor.name);
        return failurePromise(lobbyRemovalFailure(failureReason));
      }

      // Attempt to unwatch the bancho lobby for this game. The OsuLobbyScanner will handle whether or not the lobby will
      // actually really be unwatched, depending on whether or not it still needs to be watched for any other games.
      const watcherResult: LobbyWatcherChanged = await this.osuLobbyScanner.tryDeleteWatcher({
        gameId,
        multiplayerId: targetLobby.banchoMultiplayerId
      });

      // update the lobby status if it's no longer being scanned
      if (!watcherResult) {
        Log.warn(`Could not remove watcher for lobby because no watcher exists for MP ${targetLobby.banchoMultiplayerId}.`);
      } else if (!watcherResult.isScanning) {
        if (initialLobbyStatus.getKey() === LobbyStatus.AWAITING_FIRST_SCAN.getKey()) {
          // not currently scanning, and was originally not being scanned, so keep status as AWAITING_FIRST_SCAN
          //targetLobby.status = LobbyStatus.AWAITING_FIRST_SCAN.getKey();
        } else if (initialLobbyStatus.getKey() === LobbyStatus.STARTED_WATCHING.getKey()) {
          // not currently scanning, but was originally being scanned, so set status to STOPPED_WATCHING
          targetLobby.status = LobbyStatus.STOPPED_WATCHING.getKey();
        }
      }

      // update some GameLobby properties to mark it as removed
      this.setRemovalPropertiesOnGameLobby(targetLobby, gameId, lobbyRemover);

      const savedLobby = await this.saveAndReloadLobby(targetLobby);
      // TODO: Decide to soft/hard delete depending on whether or not match-scores have been recorded for the lobby:
      // - if the lobby has some recorded matches, keep the lobby in the database
      // - if the lobby has no recorded matches, hard-delete the lobby from the database
      // - if the lobby has some recorded matches, refuse the lobby remove command

      const removedLobbyResult: RemovedLobbyResult = {
        gameIdRemovedFrom: removingGame.id,
        lobby: savedLobby
      };

      return successPromise(removedLobbyResult);
    } catch (error) {
      Log.methodError(this.processRemoveLobbyRequest, this.constructor.name, error);
      throw error;
    }
  }

  private setRemovalPropertiesOnGameLobby(targetLobby: Lobby, gameId: number, lobbyRemoveUser: User) {
    // GL: targetLobby.removedAt = Helpers.getNow();
    // GL: targetLobby.removedBy = lobbyRemoveUser;
    const gameLobby = targetLobby.gameLobbies.find(gameLobby => gameLobby.game.id === gameId);
    gameLobby.removedAt = Helpers.getNow();
    gameLobby.removedBy = lobbyRemoveUser;
  }

  /**
   * Removes a game from the given Lobby if one matches the given game ID, and returns the removed game.
   *
   * @private
   * @param {Lobby} lobby
   * @param {number} targetGameId
   * @returns {GameLobby}
   * @memberof LobbyService
   */
  private extractGameLobbyFromLobby(lobby: Lobby, targetGameId: number): GameLobby {
    // GL: const games: Game[] = lobby.games.filter(lobbyGame => lobbyGame.id === targetGameId);
    // GL: if (!games.length) return null;
    // GL: const removedGame: Game = games[0];
    // GL: const i = lobby.games.indexOf(removedGame);
    // GL: lobby.games.splice(i, 1);
    if (!lobby.gameLobbies.length) return null;
    const removingGameLobby: GameLobby = lobby.gameLobbies.find(gameLobby => gameLobby.game.id === targetGameId);
    const i = lobby.gameLobbies.indexOf(removingGameLobby);
    const removedGameLobby = lobby.gameLobbies.splice(i, 1)[0];
    return removedGameLobby;
  }

  /**
   * Returns true if a game-lobby already exists for the given Bancho-multiplayer-id.
   *
   * @private
   * @param {string} banchoMultiplayerId
   * @param {number} gameId
   * @returns {Promise<Boolean>}
   */
  private async isGameUsingBanchoMultiplayerIdAndNotRemoved(banchoMultiplayerId: string, gameId: number): Promise<Boolean> {
    try {
      const mpids = await this.getBanchoMultiplayerIdsForGame(gameId);
      const answer = mpids.includes(banchoMultiplayerId);
      Log.methodSuccess(this.isGameUsingBanchoMultiplayerIdAndNotRemoved, this.constructor.name);
      return answer;
    } catch (error) {
      Log.methodError(this.isGameUsingBanchoMultiplayerIdAndNotRemoved, this.constructor.name, error);
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
    creator: User,
    lobbyData: AddLobbyDto
  ): Promise<Either<Failure<LobbyFailure | GameFailure | UserFailure>, Lobby>> {
    try {
      // 2019-08-30
      // - The following comment is out of date since we created the GameLobby relationship, but leaving it here for some insight.
      //
      // If a Lobby already exists with this MP ID, use that Lobby instead. This is to ensure the MP ID is always unique for all lobbies.
      // This means the "addedBy" is always set to the original lobby-adder, not necessarily the user performing this add-lobby-request.
      // This could have some weird side-effects e.g. if two users from two Discord servers add the same lobby to different games, the
      // Discord-message-reply will show for one user that the Lobby was added by the other user from the other server.
      let lobbyToSave: Lobby;
      const existingLobby = await Lobby.findOne(
        { banchoMultiplayerId: unsavedNewLobby.banchoMultiplayerId },
        // GL: { relations: ["games"] }
        {
          relations: [
            "gameLobbies",
            "gameLobbies.game",
            "gameLobbies.lobby",
            "gameLobbies.addedBy",
            "gameLobbies.addedBy.discordUser",
            "gameLobbies.addedBy.webUser"
          ]
        }
      );

      let gameLobbyToBeSaved = new GameLobby();
      gameLobbyToBeSaved.addedBy = creator;
      gameLobbyToBeSaved.startingMapNumber = this.getStartingMapNumberFromAddLobbyDto(lobbyData);
      gameLobbyToBeSaved.game = game;

      if (!existingLobby) {
        // GL: lobbyToSave = unsavedNewLobby;
        // GL: lobbyToSave.games = [game];
        // GL: lobbyToSave.addedBy = creator;
        gameLobbyToBeSaved.lobby = unsavedNewLobby;
        lobbyToSave = unsavedNewLobby;
        lobbyToSave.gameLobbies = [gameLobbyToBeSaved];
      } else {
        const existingGameLobby = existingLobby.gameLobbies.find(
          gameLobby => gameLobby.game.id === game.id && gameLobby.lobby.id === existingLobby.id
        );
        if (existingGameLobby) {
          // A GameLobby already exists for this lobby-game relationship (a lobby was likely previously removed, and is now being re-added),
          // so here we update its properties as if it were being added for the first time.
          existingGameLobby.removedBy = null;
          existingGameLobby.removedAt = null;
          existingGameLobby.addedBy = creator;
          existingGameLobby.startingMapNumber = this.getStartingMapNumberFromAddLobbyDto(lobbyData);
          gameLobbyToBeSaved = existingGameLobby;
        }

        // GL: lobbyToSave.games.push(game);
        existingLobby.status = unsavedNewLobby.status;
        gameLobbyToBeSaved.lobby = existingLobby;
        lobbyToSave = existingLobby;
        lobbyToSave.gameLobbies.push(gameLobbyToBeSaved);
      }

      // save and reload lobby
      const reloadedLobby: Lobby = await this.saveAndReloadLobby(lobbyToSave);
      // GL: [
      //   "gameLobbies",
      //   "gameLobbies.lobby",
      //   "gameLobbies.game",
      //   "gameLobbies.addedBy",
      //   "gameLobbies.addedBy.discordUser",
      //   "gameLobbies.addedBy.webUser"
      // ]

      return successPromise(reloadedLobby);
    } catch (error) {
      Log.methodError(this.saveLobbyWithRelations, this.constructor.name, error);
      throw error;
    }
  }

  private getStartingMapNumberFromAddLobbyDto(lobbyData: AddLobbyDto): number {
    return lobbyData.startAtMap > 1 ? lobbyData.startAtMap : 1;
  }

  private async saveAndReloadLobby(lobbyToSave: Lobby, relations: string[] = []) {
    return await this.save(lobbyToSave);
    // GL: const savedLobby: Lobby = await this.save(lobbyToSave);
    // GL: const reloadedLobby: Lobby = await this.lobbyRepository.findOne({ id: savedLobby.id }, { relations: relations });
    // GL: return reloadedLobby;
  }

  private getSingleGameOfLobby(lobby: Lobby): Game {
    // GL: return lobby.games.length ? lobby.games.slice(-1)[0] : null;
    return lobby.gameLobbies.length ? lobby.gameLobbies.slice(-1)[0].game : null;
  }

  private async getBanchoMultiplayerIdsForGame(gameId: number): Promise<string[]> {
    const game = await this.gameRepository.findGameWithLobbies(gameId);
    // GL: if (!game.lobbies || !game.lobbies.length) {
    //   return [];
    // }
    // return game.lobbies.map(lobby => lobby.banchoMultiplayerId);

    if (!game.gameLobbies || !game.gameLobbies.length) {
      return [];
    }

    return game.gameLobbies
      .filter(gameLobby => !gameLobby.removedAt) // do not include a game-lobby if it was removed
      .map(gameLobby => {
        if (gameLobby.lobby) return gameLobby.lobby.banchoMultiplayerId;
      });
  }
}
