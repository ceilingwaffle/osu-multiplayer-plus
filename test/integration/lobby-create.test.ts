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
const createGame1DiscordRequest: DiscordRequestDto = {
  type: "discord",
  authorId: "tester1",
  originChannel: "tester1's amazing channel"
};
// user 2 creates game 2
const createGame2DiscordRequest: DiscordRequestDto = {
  type: "discord",
  authorId: "tester2",
  originChannel: "tester2's amazing channel"
};
// user 1 creates game 3
const createGame3DiscordRequest: DiscordRequestDto = {
  type: "discord",
  authorId: "tester1",
  originChannel: "tester1's amazing channel"
};

describe("When adding a lobby", function() {
  this.beforeEach(function() {
    return TestHelpers.reloadEntities(getEntities());
  });

  describe("without a specified game id", function() {
    this.beforeEach(function() {
      return new Promise(async (resolve, reject) => {
        try {
          /* #region  Setup */
          const gameController = iocContainer.get(GameController);

          // user 1 creates game 1
          const createGame1Response = await gameController.create({
            gameDto: {
              countFailedScores: true,
              teamLives: 11
            },
            requestDto: createGame1DiscordRequest
          });
          if (!createGame1Response!.success) fail();

          // user 2 creates game 2
          const createGame2Response = await gameController.create({
            gameDto: {
              countFailedScores: false,
              teamLives: 22
            },
            requestDto: createGame2DiscordRequest
          });
          if (!createGame2Response!.success) fail();

          // user 1 creates game 3
          const createGame3Response = await gameController.create({
            gameDto: {
              countFailedScores: true,
              teamLives: 33
            },
            requestDto: createGame3DiscordRequest
          });
          if (!createGame3Response!.success) fail();
          /* #endregion */

          return resolve();
        } catch (error) {
          return reject(error);
        }
      });
    });

    it("should attach the lobby to the requesting user's most recent game created", function() {
      return new Promise(async (resolve, reject) => {
        try {
          /* #region  Setup */
          const discordUserRepository = getCustomRepository(DiscordUserRepository);

          const lobbyDto: AddLobbyDto = {
            banchoMultiplayerId: "12345"
          };

          // user 2 adds a lobby without specifying a game id
          const lobbyController = iocContainer.get(LobbyController);
          const lobbyAddResponse = await lobbyController.addLobby({
            lobbyData: lobbyDto,
            requestDto: createGame2DiscordRequest
          });

          const game2creator = await discordUserRepository.findByDiscordUserId(createGame2DiscordRequest.authorId);
          /* #endregion */

          /* #region  Assertions */
          assert.isNotNull(lobbyAddResponse);
          assert.isTrue(lobbyAddResponse.success);
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
            22,
            "The lobby should be added to game id 2 (the game most recently created by user 2)."
          );
          assert.equal(savedLobby.addedBy, game2creator.user, "The lobby should reflect that it was added by user 2.");
          /* #endregion */

          return resolve();
        } catch (error) {
          return reject(error);
        }
      });
    });

    // it("should save the lobby in the database", function() {
    //   return new Promise(async (resolve, reject) => {
    //     try {
    //       return resolve();
    //     } catch (error) {
    //       return reject(error);
    //     }
    //   });
    // });

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
  });

  describe("with a specified game id", function() {
    it("should attach the lobby to the specified game", function() {
      return new Promise(async (resolve, reject) => {
        try {
          /* #region  Setup */
          const discordUserRepository = getCustomRepository(DiscordUserRepository);

          const lobbyDto: AddLobbyDto = {
            banchoMultiplayerId: "23456",
            gameId: 3
          };

          // user 1 adds a lobby to game 3
          const lobbyController = iocContainer.get(LobbyController);
          const lobbyAddResponse = await lobbyController.addLobby({
            lobbyData: lobbyDto,
            requestDto: createGame3DiscordRequest
          });

          const game3creator = await discordUserRepository.findByDiscordUserId(createGame3DiscordRequest.authorId);
          /* #endregion */

          /* #region  Assertions */
          assert.isTrue(lobbyAddResponse!.success);
          assert.isTrue(lobbyAddResponse!.result instanceof Lobby);
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
          assert.equal(savedLobby.games[0].teamLives, 33, "The lobby should be added to game id 3 (the game id specified by user 1).");
          assert.equal(savedLobby.addedBy, game3creator.user, "The lobby should reflect that it was added by user 3.");
          /* #endregion */

          return resolve();
        } catch (error) {
          return reject(error);
        }
      });
    });
  });

  this.afterAll(function() {});
});
