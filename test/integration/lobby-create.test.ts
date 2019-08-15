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
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should save the lobby on the requesting user's most recent game created", function() {
    return new Promise(async (resolve, reject) => {
      try {
        /* #region  Setup */
        const discordUserRepository = getCustomRepository(DiscordUserRepository);

        const lobbyDto: AddLobbyDto = {
          banchoMultiplayerId: "54078930" // replace this with a valid mp id if it expires
        };

        // fake out the watcher timer so we don't actually start fetching match results for the lobby
        const clock: InstalledClock = lolex.install();
        // user 2 adds a lobby without specifying a game id
        const lobbyController = iocContainer.get(LobbyController);
        const lobbyAddResponse = await lobbyController.create({
          lobbyData: lobbyDto,
          requestDto: createGame2DiscordRequest
        });
        clock.uninstall();

        const game2creator = await discordUserRepository.findByDiscordUserId(createGame2DiscordRequest.authorId);
        /* #endregion */

        /* #region  Assertions */
        assert.isNotNull(lobbyAddResponse);
        assert.isTrue(lobbyAddResponse.success, "Lobby failed to be created.");
        assert.isTrue(lobbyAddResponse.result instanceof Lobby);
        const savedLobby = lobbyAddResponse.result;
        assert.isNotNull(savedLobby);
        assert.isNotNull(savedLobby.banchoMultiplayerId);
        assert.equal(
          savedLobby.banchoMultiplayerId,
          lobbyDto.banchoMultiplayerId,
          "The Bancho multiplayer ID should match the one provided in the add-lobby request."
        );
        assert.isNotNull(game2creator);
        assert.isNotNull(game2creator.user);
        assert.isNotNull(savedLobby.games[0], "The lobby should be attached to a game.");
        assert.lengthOf(savedLobby.games, 1, "The lobby should only be added to one game.");
        assert.equal(
          savedLobby.games[0].teamLives,
          game2.teamLives,
          "The lobby should be added to game id 2 (the game most recently created by user 2)."
        );
        assert.equal(savedLobby.addedBy.id, game2creator.user.id, "The lobby should reflect that it was added by user 2.");

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

        const lobbyDto: AddLobbyDto = {
          banchoMultiplayerId: "54078930", // replace this with a valid mp id if it expires
          gameId: 3
        };

        // fake out the watcher timer so we don't actually start fetching match results for the lobby
        const clock: InstalledClock = lolex.install();
        // user 1 adds a lobby to game 3
        const lobbyController = iocContainer.get(LobbyController);
        const lobbyAddResponse = await lobbyController.create({
          lobbyData: lobbyDto,
          requestDto: createGame3DiscordRequest
        });
        clock.uninstall();

        const game3creator = await discordUserRepository.findByDiscordUserId(createGame3DiscordRequest.authorId);
        /* #endregion */

        /* #region  Assertions */
        assert.isNotNull(lobbyAddResponse);
        assert.isTrue(lobbyAddResponse.success, "Lobby failed to be created.");
        assert.isTrue(lobbyAddResponse.result instanceof Lobby);
        const savedLobby = lobbyAddResponse.result;
        assert.isNotNull(savedLobby);
        assert.isNotNull(savedLobby.banchoMultiplayerId);
        assert.equal(
          savedLobby.banchoMultiplayerId,
          lobbyDto.banchoMultiplayerId,
          "The Bancho multiplayer ID should match the one provided in the add-lobby request."
        );
        assert.isNotNull(game3creator!.user);
        assert.isNotNull(savedLobby.games[0], "The lobby should be attached to a game.");
        assert.lengthOf(savedLobby.games, 1, "The lobby should only be added to one game.");
        assert.equal(
          savedLobby.games[0].teamLives,
          game3.teamLives,
          "The lobby should be added to game id 3 (the game id specified by user 1)."
        );
        assert.equal(savedLobby.addedBy.id, game3creator.user.id, "The lobby should reflect that it was added by user 3.");
        /* #endregion */

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should initiate the lobby scanner", function() {
    return new Promise(async (resolve, reject) => {
      try {
        // TODO: Stub osu lobby scanner
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });
});
