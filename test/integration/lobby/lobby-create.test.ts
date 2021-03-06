import "../../../src/bootstrap";
import "mocha";
import { assert, expect } from "chai";
import { TestHelpers, TestContextEntities } from "../../test-helpers";
import iocContainer from "../../../src/inversify.config";
import { DiscordUser } from "../../../src/domain/user/discord-user.entity";
import { User } from "../../../src/domain/user/user.entity";
import { Game } from "../../../src/domain/game/game.entity";
import { LobbyController } from "../../../src/domain/lobby/lobby.controller";
import { AddLobbyDto } from "../../../src/domain/lobby/dto/add-lobby.dto";
import { Lobby } from "../../../src/domain/lobby/lobby.entity";
import { GameController } from "../../../src/domain/game/game.controller";
import { fail } from "assert";
import { DiscordUserRepository } from "../../../src/domain/user/discord-user.repository";
import { DiscordRequestDto } from "../../../src/requests/dto";
import { getCustomRepository, Connection } from "typeorm";
import { GameRepository } from "../../../src/domain/game/game.repository";
import { CreateGameDto } from "../../../src/domain/game/dto/create-game.dto";
import { LobbyRepository } from "../../../src/domain/lobby/lobby.repository";
import { DiscordUserReportProperties } from "../../../src/domain/shared/reports/discord-user-report-properties";
import { AddLobbyReport } from "../../../src/domain/lobby/reports/add-lobby.report";
import { EndGameDto } from "../../../src/domain/game/dto/end-game.dto";
import { LobbyStatus } from "../../../src/domain/lobby/lobby-status";
import TYPES from "../../../src/types";
import { IDbClient } from "../../../src/database/db-client";

function getEntities(conn: Connection): TestContextEntities[] {
  return [
    {
      name: conn.getMetadata(User).name,
      tableName: conn.getMetadata(User).tableName,
      values: []
    },
    {
      name: conn.getMetadata(DiscordUser).name,
      tableName: conn.getMetadata(DiscordUser).tableName,
      values: []
    },
    {
      name: conn.getMetadata(Game).name,
      tableName: conn.getMetadata(Game).tableName,
      values: []
    },
    {
      name: conn.getMetadata(Lobby).name,
      tableName: conn.getMetadata(Lobby).tableName,
      values: []
    }
  ];
}

// user 1 creates game 1
const game1: CreateGameDto = {
  countFailedScores: "true",
  teamLives: 11
};
const createGame1DiscordRequest: DiscordRequestDto = {
  commType: "discord",
  authorId: "tester1",
  originChannelId: "tester1's amazing channel"
};
// user 2 creates game 2
const game2: CreateGameDto = {
  countFailedScores: "false",
  teamLives: 22
};
const createGame2DiscordRequest: DiscordRequestDto = {
  commType: "discord",
  authorId: "tester2",
  originChannelId: "tester2's amazing channel"
};
// user 1 creates game 3
const game3: CreateGameDto = {
  countFailedScores: "true",
  teamLives: 33
};
const createGame3DiscordRequest: DiscordRequestDto = {
  commType: "discord",
  authorId: "tester1",
  originChannelId: "tester1's amazing channel"
};

describe("When adding a lobby", function() {
  this.beforeEach(function() {
    return new Promise(async (resolve, reject) => {
      try {
        const conn = await iocContainer.get<IDbClient>(TYPES.IDbClient).connect();
        await TestHelpers.loadAll(getEntities(conn), conn);

        /* #region  Setup */
        const gameController = iocContainer.get<GameController>(TYPES.GameController);

        // user 1 creates game 1
        const createGame1Response = await gameController.create({
          gameDto: game1,
          requestDto: createGame1DiscordRequest
        });
        if (!createGame1Response || !createGame1Response.success) {
          fail();
        }

        // user 2 creates game 2
        const createGame2Response = await gameController.create({
          gameDto: game2,
          requestDto: createGame2DiscordRequest
        });
        if (!createGame2Response || !createGame2Response.success) {
          fail();
        }

        // user 1 creates game 3
        const createGame3Response = await gameController.create({
          gameDto: game3,
          requestDto: createGame3DiscordRequest
        });
        if (!createGame3Response || !createGame3Response.success) {
          fail();
        }
        /* #endregion */

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  this.afterEach(function() {
    return new Promise(async (resolve, reject) => {
      try {
        const conn = iocContainer.get<IDbClient>(TYPES.IDbClient).getConnection();
        await TestHelpers.dropTestDatabase(conn);
        conn.close();
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should save a new lobby on the requesting user's most recent game created", function() {
    return new Promise(async (resolve, reject) => {
      try {
        /* #region  Setup */
        const discordUserRepository = getCustomRepository(DiscordUserRepository);
        const lobbyRepository = getCustomRepository(LobbyRepository);

        const lobbyDto: AddLobbyDto = {
          banchoMultiplayerId: "54078930" // replace this with a valid mp id if it expires
        };

        // user 2 adds a lobby without specifying a game id
        const lobbyController = iocContainer.get<LobbyController>(TYPES.LobbyController);
        const lobbyAddResponse = await lobbyController.create({
          lobbyDto: lobbyDto,
          requestDto: createGame2DiscordRequest
        });

        const game2creator = await discordUserRepository.findByDiscordUserId(createGame2DiscordRequest.authorId);
        const savedLobby = await lobbyRepository.findOne(
          { banchoMultiplayerId: lobbyDto.banchoMultiplayerId },
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
        /* #endregion */

        /* #region  Assertions */
        assert.isNotNull(lobbyAddResponse);
        assert.isTrue(lobbyAddResponse.success, "Lobby failed to be created.");
        assert.isDefined(lobbyAddResponse.result as AddLobbyReport);
        const lobbyReport = lobbyAddResponse.result;
        assert.isNotNull(lobbyReport);
        assert.isNotNull(lobbyReport.multiplayerId);
        assert.equal(
          lobbyReport.multiplayerId,
          lobbyDto.banchoMultiplayerId,
          "The Bancho multiplayer ID should match the one provided in the add-lobby request."
        );
        assert.isNotNull(game2creator);
        assert.isNotNull(game2creator.user);
        assert.isDefined(savedLobby);
        const savedLobbyGames = savedLobby.gameLobbies.map(gameLobby => gameLobby.game);
        const savedLobbyAddedBy = savedLobby.gameLobbies.find(gameLobby => gameLobby.lobby.id === savedLobby.id).addedBy;
        assert.isNotNull(savedLobbyGames[0], "The lobby should be attached to a game.");
        assert.lengthOf(savedLobbyGames, 1, "The lobby should only be added to one game.");
        assert.equal(
          savedLobbyGames[0].teamLives,
          game2.teamLives,
          "The lobby should be added to game id 2 (the game most recently created by user 2)."
        );
        assert.equal(savedLobbyGames[0].id, 2, "The lobby should be added to game id 2 (the game most recently created by user 2).");
        assert.equal(savedLobbyGames.length, 1, "The lobby should only include a reference to a single game.");
        assert.equal(savedLobbyAddedBy.id, game2creator.user.id, "The lobby should reflect that it was added by user 2.");
        const addedByDiscordUser = lobbyReport.addedBy as DiscordUserReportProperties;
        assert.equal(
          addedByDiscordUser.discordUserId,
          game2creator.discordUserId,
          "The lobby should reflect that it was added by the same Discord user ID as user 2."
        );

        // game with id 2 should reference the saved lobby
        const gameRepository = getCustomRepository(GameRepository);
        let game: Game;
        game = await gameRepository.findOne({ id: 2 }, { relations: ["gameLobbies", "gameLobbies.lobby"] });
        assert.equal(savedLobby.id, game.gameLobbies[0].lobby.id, "Game with ID 2 should contain a reference to the new lobby.");
        // game with id 1 should NOT reference the saved lobby
        game = await gameRepository.findOne({ id: 1 }, { relations: ["gameLobbies"] });
        assert.isUndefined(game.gameLobbies[0], "Game with ID 1 should NOT contain a reference to any lobbies.");
        /* #endregion */

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should save a new lobby on a game targetted by its game ID", function() {
    return new Promise(async (resolve, reject) => {
      try {
        /* #region  Setup */
        const discordUserRepository = getCustomRepository(DiscordUserRepository);
        const lobbyRepository = getCustomRepository(LobbyRepository);

        const lobbyDto: AddLobbyDto = {
          banchoMultiplayerId: "54078930", // replace this with a valid mp id if it expires
          gameId: 3
        };

        // user 1 adds a lobby to game 3
        const lobbyController = iocContainer.get<LobbyController>(TYPES.LobbyController);
        const lobbyAddResponse = await lobbyController.create({
          lobbyDto: lobbyDto,
          requestDto: createGame3DiscordRequest
        });

        const game3creator = await discordUserRepository.findByDiscordUserId(createGame3DiscordRequest.authorId);
        const savedLobby = await lobbyRepository.findOne(
          { banchoMultiplayerId: lobbyDto.banchoMultiplayerId },
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
        /* #endregion */

        /* #region  Assertions */
        assert.isNotNull(lobbyAddResponse);
        assert.isTrue(lobbyAddResponse.success, "Lobby failed to be created.");
        assert.isDefined(lobbyAddResponse.result as AddLobbyReport);
        const lobbyReport = lobbyAddResponse.result;
        assert.isNotNull(lobbyReport);
        assert.isNotNull(lobbyReport.multiplayerId);
        assert.equal(
          lobbyReport.multiplayerId,
          lobbyDto.banchoMultiplayerId,
          "The Bancho multiplayer ID should match the one provided in the add-lobby request."
        );
        assert.isNotNull(game3creator!.user);
        assert.isDefined(savedLobby);
        const savedLobbyGames = savedLobby.gameLobbies.map(gameLobby => gameLobby.game);
        const savedLobbyAddedBy = savedLobby.gameLobbies.find(gameLobby => gameLobby.lobby.id === savedLobby.id).addedBy;
        assert.isNotNull(savedLobbyGames[0], "The lobby should be attached to a game.");
        assert.lengthOf(savedLobbyGames, 1, "The lobby should only be added to one game.");
        assert.equal(
          savedLobbyGames[0].teamLives,
          game3.teamLives,
          "The lobby should be added to game id 3 (the game most recently created by user 2)."
        );
        assert.equal(savedLobbyGames[0].id, 3, "The lobby should be added to game id 3 (the game targeted in the DTO).");
        assert.equal(savedLobbyGames.length, 1, "The lobby should only include a reference to a single game.");
        assert.equal(savedLobbyAddedBy.id, game3creator.user.id, "The lobby should reflect that it was added by user 3.");
        const addedByDiscordUser = lobbyReport.addedBy as DiscordUserReportProperties;
        assert.equal(
          addedByDiscordUser.discordUserId,
          game3creator.discordUserId,
          "The lobby should reflect that it was added by the same Discord user ID as user 3."
        );
        /* #endregion */

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  xit("should initiate the lobby scanner", function() {
    return new Promise(async (resolve, reject) => {
      try {
        // TODO: Stub osu lobby scanner
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should fail to save a lobby when targetting a game ID of a game that doesn't exist", function() {
    return new Promise(async (resolve, reject) => {
      try {
        /* #region  Setup */
        const lobbyDto: AddLobbyDto = {
          banchoMultiplayerId: "54078930", // replace this with a valid mp id if it expires
          gameId: 999 // game ID should not exist
        };

        // user 1 adds a lobby to an non-existent game ID
        const lobbyController = iocContainer.get<LobbyController>(TYPES.LobbyController);
        const lobbyAddResponse = await lobbyController.create({
          lobbyDto: lobbyDto,
          requestDto: createGame1DiscordRequest
        });
        /* #endregion */

        /* #region  Assertions */
        assert.isNotNull(lobbyAddResponse);
        assert.isFalse(lobbyAddResponse.success, "Lobby was created but should have failed.");
        assert.isDefined(lobbyAddResponse.errors);
        assert.isDefined(lobbyAddResponse.errors.messages);
        assert.isTrue(lobbyAddResponse.errors.messages.length > 0, "Lobby-add-response should contain some error messages.");
        /* #endregion */

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should fail to save a lobby when the Bancho-multiplayer-id is already associated with a lobby on the target game", function() {
    return new Promise(async (resolve, reject) => {
      try {
        /* #region  Setup */
        const lobbyDto1: AddLobbyDto = {
          banchoMultiplayerId: "54078930", // replace this with a valid mp id if it expires
          gameId: 3
        };
        const lobbyDto2: AddLobbyDto = {
          banchoMultiplayerId: "54078930", // replace this with a valid mp id if it expires
          gameId: 3
        };

        // user 1 adds a lobby to game 3 (should succeed)
        const lobbyController = iocContainer.get<LobbyController>(TYPES.LobbyController);
        const lobbyAddResponse1 = await lobbyController.create({
          lobbyDto: lobbyDto1,
          requestDto: createGame3DiscordRequest
        });
        // user 1 *attempts* to add the same lobby to game 3 (should fail)
        const lobbyAddResponse2 = await lobbyController.create({
          lobbyDto: lobbyDto2,
          requestDto: createGame3DiscordRequest
        });

        const lobbyRepository = getCustomRepository(LobbyRepository);
        const savedLobby = await lobbyRepository.findOne(
          { banchoMultiplayerId: lobbyDto1.banchoMultiplayerId },
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
        /* #endregion */

        /* #region  Assertions */
        // Ensure the lobby response reflects a failed attempt to save the lobby.
        assert.isNotNull(lobbyAddResponse1);
        assert.isTrue(lobbyAddResponse1.success, "The first lobby-add request failed but should have succeeded.");
        assert.isNotNull(lobbyAddResponse2);
        assert.isFalse(lobbyAddResponse2.success, "The second lobby-add request succeeded but should have failed.");
        assert.isDefined(lobbyAddResponse2.message);
        assert.isDefined(lobbyAddResponse2.errors);
        assert.isDefined(lobbyAddResponse2.errors.messages);
        assert.isTrue(lobbyAddResponse2.errors.messages.length > 0);

        // Ensure the lobby exists in the database from the first request.
        // This ensures that the response isn't a failure due to it not saving anything during the first attempt aswell.
        const savedLobbyGames = savedLobby.gameLobbies.map(gameLobby => gameLobby.game);
        assert.isDefined(savedLobby);
        assert.isNotNull(savedLobbyGames[0], "The lobby should be attached to a game.");
        assert.equal(savedLobbyGames[0].id, 3, "The lobby should be associated with game id 3 (the game targeted in the DTO).");

        /* #endregion */
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should fail to save a Lobby when the requesting user has not yet created a game and when no game ID was provided", function() {
    return new Promise(async (resolve, reject) => {
      try {
        // there should be no games in the database
        const conn: Connection = iocContainer.get<IDbClient>(TYPES.IDbClient).getConnection();
        await TestHelpers.dropDatabaseAndReloadEntities(getEntities(conn), conn);

        const lobbyDto1: AddLobbyDto = {
          banchoMultiplayerId: "54078930", // replace this with a valid mp id if it expires
          gameId: 1
        };

        // user 1 attempts to add a lobby without having ever created a game
        const lobbyController = iocContainer.get<LobbyController>(TYPES.LobbyController);
        const lobbyAddResponse1 = await lobbyController.create({
          lobbyDto: lobbyDto1,
          requestDto: createGame1DiscordRequest
        });

        const lobbyRepository = getCustomRepository(LobbyRepository);
        const lobbyShouldNotExist = await lobbyRepository.findOne(
          { banchoMultiplayerId: lobbyDto1.banchoMultiplayerId },
          { relations: [] }
        );

        assert.isFalse(lobbyAddResponse1.success, "The lobby-add request succeeded but should have failed.");
        assert.isDefined(lobbyAddResponse1.message);
        assert.isDefined(lobbyAddResponse1.errors);
        assert.isDefined(lobbyAddResponse1.errors.messages);
        assert.isTrue(lobbyAddResponse1.errors.messages.length > 0);
        assert.isUndefined(lobbyShouldNotExist, "The lobby should not have been added to the database.");

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should fail to add a lobby to an ended-game", function() {
    return new Promise(async (resolve, reject) => {
      try {
        const endGameDto1: EndGameDto = {
          gameId: 1
        };
        const lobbyDto1: AddLobbyDto = {
          banchoMultiplayerId: "54078930", // replace this with a valid mp id if it expires
          gameId: 1
        };

        // update game status to closed
        const gameController = iocContainer.get<GameController>(TYPES.GameController);
        const gameEndResponse1 = await gameController.endGame({ endGameDto: endGameDto1, requestDto: createGame1DiscordRequest });

        // user 1 attempts to add a lobby to a game that has ended
        const lobbyController = iocContainer.get<LobbyController>(TYPES.LobbyController);
        const lobbyAddResponse1 = await lobbyController.create({
          lobbyDto: lobbyDto1,
          requestDto: createGame1DiscordRequest
        });

        const lobbyRepository = getCustomRepository(LobbyRepository);
        const lobbyShouldNotExist = await lobbyRepository.findOne(
          { banchoMultiplayerId: lobbyDto1.banchoMultiplayerId },
          { relations: [] }
        );

        assert.isTrue(gameEndResponse1.success, "The end-game request failed to end the game.");
        assert.isFalse(lobbyAddResponse1.success, "Adding the lobby succeeded but it should have failed.");
        assert.isDefined(lobbyAddResponse1.message);
        assert.isDefined(lobbyAddResponse1.errors);
        assert.isDefined(lobbyAddResponse1.errors.messages);
        assert.isTrue(lobbyAddResponse1.errors.messages.length > 0);
        assert.isUndefined(lobbyShouldNotExist, "The lobby should not have been added to the database.");

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should create a new relationship between the target-game and an existing-Lobby when re-using a Bancho-multiplayer-id", function() {
    return new Promise(async (resolve, reject) => {
      try {
        /* #region  Setup */
        const lobbyDto1: AddLobbyDto = {
          banchoMultiplayerId: "54078930", // replace this with a valid mp id if it expires
          gameId: 1
        };
        const lobbyDto2: AddLobbyDto = {
          banchoMultiplayerId: "54078930", // replace this with a valid mp id if it expires
          gameId: 2
        };

        // user 1 adds a lobby to game 1 (should succeed)
        const lobbyController = iocContainer.get<LobbyController>(TYPES.LobbyController);
        const lobbyAddResponse1 = await lobbyController.create({
          lobbyDto: lobbyDto1,
          requestDto: createGame3DiscordRequest
        });
        // user 1 adds the same lobby to game 2 (should succeed)
        const lobbyAddResponse2 = await lobbyController.create({
          lobbyDto: lobbyDto2,
          requestDto: createGame3DiscordRequest
        });

        const lobbyRepository = getCustomRepository(LobbyRepository);
        const savedLobby = await lobbyRepository.findOne(
          { banchoMultiplayerId: lobbyDto1.banchoMultiplayerId },
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
        /* #endregion */

        /* #region  Assertions */
        // Ensure the lobby response reflects a failed attempt to save the lobby.
        assert.isNotNull(lobbyAddResponse1);
        assert.isTrue(lobbyAddResponse1.success, "The first lobby-add request failed but should have succeeded.");
        assert.isNotNull(lobbyAddResponse2);
        assert.isTrue(lobbyAddResponse2.success, "The second lobby-add request failed but should have succeeded.");

        const savedLobbyGames = savedLobby.gameLobbies.map(gameLobby => gameLobby.game);
        assert.isDefined(savedLobby);
        assert.isDefined(savedLobbyGames, "The lobby should contains a games property.");
        assert.equal(savedLobbyGames.length, 2, "The lobby should be associated with 2 games.");
        assert.equal(savedLobbyGames[0].id, 1, "The lobby should be associated with game id 1 (the game targeted in the DTO).");
        assert.equal(savedLobbyGames[1].id, 2, "The lobby should be associated with game id 2 (the game targeted in the DTO).");

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should add a lobby, remove the lobby, then re-add the lobby", function() {
    return new Promise(async (resolve, reject) => {
      try {
        const lobbyController = iocContainer.get<LobbyController>(TYPES.LobbyController);

        const lobbyDto1: AddLobbyDto = {
          banchoMultiplayerId: "54078930", // replace this with a valid mp id if it expires
          gameId: 1
        };

        // user 1 adds lobby 1 to game 1
        const lobbyAddResponse1 = await lobbyController.create({
          lobbyDto: lobbyDto1,
          requestDto: createGame1DiscordRequest
        });
        assert.isTrue(lobbyAddResponse1 && lobbyAddResponse1.success);

        // user 1 removes lobby 1 from game 1
        const lobbyRemoveResponse1 = await lobbyController.remove({
          lobbyDto: lobbyDto1,
          requestDto: createGame1DiscordRequest
        });
        assert.isTrue(lobbyRemoveResponse1 && lobbyRemoveResponse1.success);

        // user 1 re-adds lobby 1 to game 1
        const lobbyAddResponse2 = await lobbyController.create({
          lobbyDto: lobbyDto1,
          requestDto: createGame1DiscordRequest
        });
        assert.isTrue(lobbyAddResponse2 && lobbyAddResponse2.success);

        // assert lobby report has expected properties
        const lobbyReport: AddLobbyReport = lobbyAddResponse2.result;
        const addedBy = lobbyReport.addedBy as DiscordUserReportProperties;
        expect(lobbyReport.status).to.equal(LobbyStatus.AWAITING_FIRST_SCAN.getText());
        expect(addedBy.discordUserId).to.equal(createGame1DiscordRequest.authorId);
        expect(lobbyReport.addedAgo).to.have.lengthOf.greaterThan(1);

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });
});
