import "../../src/index";
import "mocha";
import { assert } from "chai";
import { TestHelpers, TestContextEntities } from "../test-helpers";
import iocContainer from "../../src/inversify.config";
import { ConnectionManager } from "../../src/utils/connection-manager";
import { DiscordUser } from "../../src/domain/user/discord-user.entity";
import { User } from "../../src/domain/user/user.entity";
import { Game } from "../../src/domain/game/game.entity";
import { LobbyController } from "../../src/domain/lobby/lobby.controller";
import { AddLobbyDto } from "../../src/domain/lobby/dto/add-lobby.dto";
import { Lobby } from "../../src/domain/lobby/lobby.entity";
import { GameController } from "../../src/domain/game/game.controller";
import { fail } from "assert";
import { DiscordUserRepository } from "../../src/domain/user/discord-user.repository";
import { DiscordRequestDto } from "../../src/requests/dto";
import { getCustomRepository } from "typeorm";
import { GameRepository } from "../../src/domain/game/game.repository";
import { CreateGameDto } from "../../src/domain/game/dto/create-game.dto";
import { InstalledClock, LolexWithContext } from "lolex";
import { LobbyRepository } from "../../src/domain/lobby/lobby.repository";
import { DiscordUserReportProperties } from "../../src/domain/shared/reports/discord-user-report-properties";
import { AddLobbyReport } from "../../src/domain/lobby/reports/add-lobby.report";
var lolex: LolexWithContext = require("lolex");

async function getEntities(): Promise<TestContextEntities[]> {
  const conn = await ConnectionManager.getInstance();

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
  countFailedScores: true,
  teamLives: 11
};
const createGame1DiscordRequest: DiscordRequestDto = {
  type: "discord",
  authorId: "tester1",
  originChannel: "tester1's amazing channel"
};
// user 2 creates game 2
const game2: CreateGameDto = {
  countFailedScores: false,
  teamLives: 22
};
const createGame2DiscordRequest: DiscordRequestDto = {
  type: "discord",
  authorId: "tester2",
  originChannel: "tester2's amazing channel"
};
// user 1 creates game 3
const game3: CreateGameDto = {
  countFailedScores: true,
  teamLives: 33
};
const createGame3DiscordRequest: DiscordRequestDto = {
  type: "discord",
  authorId: "tester1",
  originChannel: "tester1's amazing channel"
};

// // lolex clock for faking the lobby watcher timers
// let clock: InstalledClock;

describe("When adding a lobby", function() {
  this.beforeAll(function() {
    return new Promise(async (resolve, reject) => {
      try {
        // console.log("Installing lolex timer...");
        // // fake out the watcher timer so we don't actually start fetching match results for the lobby
        // clock = lolex.install({ target: { setInterval: OsuLobbyWatcher }, now: 0, toFake: ["setInterval"] });
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  this.beforeEach(function() {
    return new Promise(async (resolve, reject) => {
      try {
        await TestHelpers.reloadEntities(getEntities());

        /* #region  Setup */
        const gameController = iocContainer.get(GameController);

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

  this.afterAll(function() {
    return new Promise(async (resolve, reject) => {
      try {
        // console.log("Uninstalling lolex timer...");
        // clock.uninstall();

        await TestHelpers.dropTestDatabase();
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

        // fake out the watcher timer so we don't actually start fetching match results for the lobby
        const clock: InstalledClock = lolex.install();
        // user 2 adds a lobby without specifying a game id
        const lobbyController = iocContainer.get(LobbyController);
        const lobbyAddResponse = await lobbyController.create({
          lobbyDto: lobbyDto,
          requestDto: createGame2DiscordRequest
        });
        clock.uninstall();

        const game2creator = await discordUserRepository.findByDiscordUserId(createGame2DiscordRequest.authorId);
        const savedLobby = await lobbyRepository.findOne(
          { banchoMultiplayerId: lobbyDto.banchoMultiplayerId },
          { relations: ["games", "games.lobbies", "addedBy", "addedBy.discordUser"] }
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
        assert.isNotNull(savedLobby.games[0], "The lobby should be attached to a game.");
        assert.lengthOf(savedLobby.games, 1, "The lobby should only be added to one game.");
        assert.equal(
          savedLobby.games[0].teamLives,
          game2.teamLives,
          "The lobby should be added to game id 2 (the game most recently created by user 2)."
        );
        assert.equal(savedLobby.games[0].id, 2, "The lobby should be added to game id 2 (the game most recently created by user 2).");
        assert.equal(savedLobby.games.length, 1, "The lobby should only include a reference to a single game.");
        assert.equal(savedLobby.addedBy.id, game2creator.user.id, "The lobby should reflect that it was added by user 2.");
        const addedByDiscordUser = lobbyReport.addedBy as DiscordUserReportProperties;
        assert.equal(
          addedByDiscordUser.discordUserId,
          game2creator.discordUserId,
          "The lobby should reflect that it was added by the same Discord user ID as user 2."
        );

        // game with id 2 should reference the saved lobby
        const gameRepository = getCustomRepository(GameRepository);
        let game: Game;
        game = await gameRepository.findOne({ id: 2 }, { relations: ["lobbies"] });
        assert.equal(savedLobby.id, game.lobbies[0].id, "Game with ID 2 should contain a reference to the new lobby.");
        // game with id 1 should NOT reference the saved lobby
        game = await gameRepository.findOne({ id: 1 }, { relations: ["lobbies"] });
        assert.isUndefined(game.lobbies[0], "Game with ID 1 should NOT contain a reference to any lobbies.");
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

        // fake out the watcher timer so we don't actually start fetching match results for the lobby
        const clock: InstalledClock = lolex.install();
        // user 1 adds a lobby to game 3
        const lobbyController = iocContainer.get(LobbyController);
        const lobbyAddResponse = await lobbyController.create({
          lobbyDto: lobbyDto,
          requestDto: createGame3DiscordRequest
        });
        clock.uninstall();

        const game3creator = await discordUserRepository.findByDiscordUserId(createGame3DiscordRequest.authorId);
        const savedLobby = await lobbyRepository.findOne(
          { banchoMultiplayerId: lobbyDto.banchoMultiplayerId },
          { relations: ["games", "games.lobbies", "addedBy", "addedBy.discordUser"] }
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
        assert.isNotNull(savedLobby.games[0], "The lobby should be attached to a game.");
        assert.lengthOf(savedLobby.games, 1, "The lobby should only be added to one game.");
        assert.equal(
          savedLobby.games[0].teamLives,
          game3.teamLives,
          "The lobby should be added to game id 3 (the game most recently created by user 2)."
        );
        assert.equal(savedLobby.games[0].id, 3, "The lobby should be added to game id 3 (the game targeted in the DTO).");
        assert.equal(savedLobby.games.length, 1, "The lobby should only include a reference to a single game.");
        assert.equal(savedLobby.addedBy.id, game3creator.user.id, "The lobby should reflect that it was added by user 3.");
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

  // it("should initiate the lobby scanner", function() {
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       // TODO: Stub osu lobby scanner
  //       return resolve();
  //     } catch (error) {
  //       return reject(error);
  //     }
  //   });
  // });

  // it("should fail to save a lobby when targetting a game ID of a game that does not exist", function() {
  //   return new Promise((resolve, reject) => {
  //     try {
  //       // TODO
  //       return resolve();
  //     } catch (error) {
  //       return reject(error);
  //     }
  //   });
  // });

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

        // fake out the watcher timer so we don't actually start fetching match results for the lobby
        const clock: InstalledClock = lolex.install();
        // user 1 adds a lobby to game 3 (should succeed)
        const lobbyController = iocContainer.get(LobbyController);
        const lobbyAddResponse1 = await lobbyController.create({
          lobbyDto: lobbyDto1,
          requestDto: createGame3DiscordRequest
        });
        // user 1 *attempts* to add the same lobby to game 3 (should fail)
        const lobbyAddResponse2 = await lobbyController.create({
          lobbyDto: lobbyDto2,
          requestDto: createGame3DiscordRequest
        });
        clock.uninstall();

        const lobbyRepository = getCustomRepository(LobbyRepository);
        const savedLobby = await lobbyRepository.findOne(
          { banchoMultiplayerId: lobbyDto1.banchoMultiplayerId },
          { relations: ["games", "games.lobbies", "addedBy", "addedBy.discordUser"] }
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
        assert.isDefined(savedLobby);
        assert.isNotNull(savedLobby.games[0], "The lobby should be attached to a game.");
        assert.equal(savedLobby.games[0].id, 3, "The lobby should be associated with game id 3 (the game targeted in the DTO).");

        /* #endregion */
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });
  // it("should fail to save a Lobby when the requesting user has not yet created a game and when no game ID was provided", function() {
  //   return new Promise((resolve, reject) => {
  //     try {
  //       // TODO
  //       return resolve();
  //     } catch (error) {
  //       return reject(error);
  //     }
  //   });
  // });
  it("it should create a new relationship between the target-game and an existing-Lobby when re-using a Bancho-multiplayer-id", function() {
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

        // fake out the watcher timer so we don't actually start fetching match results for the lobby
        const clock: InstalledClock = lolex.install();
        // user 1 adds a lobby to game 1 (should succeed)
        const lobbyController = iocContainer.get(LobbyController);
        const lobbyAddResponse1 = await lobbyController.create({
          lobbyDto: lobbyDto1,
          requestDto: createGame3DiscordRequest
        });
        // user 1 adds the same lobby to game 2 (should succeed)
        const lobbyAddResponse2 = await lobbyController.create({
          lobbyDto: lobbyDto2,
          requestDto: createGame3DiscordRequest
        });
        clock.uninstall();

        const lobbyRepository = getCustomRepository(LobbyRepository);
        const savedLobby = await lobbyRepository.findOne(
          { banchoMultiplayerId: lobbyDto1.banchoMultiplayerId },
          { relations: ["games", "games.lobbies", "addedBy", "addedBy.discordUser"] }
        );
        /* #endregion */

        /* #region  Assertions */
        // Ensure the lobby response reflects a failed attempt to save the lobby.
        assert.isNotNull(lobbyAddResponse1);
        assert.isTrue(lobbyAddResponse1.success, "The first lobby-add request failed but should have succeeded.");
        assert.isNotNull(lobbyAddResponse2);
        assert.isTrue(lobbyAddResponse2.success, "The second lobby-add request failed but should have succeeded.");

        assert.isDefined(savedLobby);
        assert.isDefined(savedLobby.games, "The lobby should contains a games property.");
        assert.equal(savedLobby.games.length, 2, "The lobby should be associated with 2 games.");
        assert.equal(savedLobby.games[0].id, 1, "The lobby should be associated with game id 1 (the game targeted in the DTO).");
        assert.equal(savedLobby.games[1].id, 2, "The lobby should be associated with game id 2 (the game targeted in the DTO).");

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });
});
