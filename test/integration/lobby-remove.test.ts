import "../../src/index";
import "mocha";
import { assert, expect } from "chai";
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
import { EndGameDto } from "../../src/domain/game/dto/end-game.dto";
import { RemoveLobbyDto } from "../../src/domain/lobby/dto/remove-lobby.dto";
import { LobbyStatus } from "../../src/domain/lobby/lobby-status";
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
  commType: "discord",
  authorId: "tester1",
  originChannelId: "tester1's amazing channel"
};
// user 2 creates game 2
const game2: CreateGameDto = {
  countFailedScores: false,
  teamLives: 22
};
const createGame2DiscordRequest: DiscordRequestDto = {
  commType: "discord",
  authorId: "tester2",
  originChannelId: "tester2's amazing channel"
};
// user 1 creates game 3
const game3: CreateGameDto = {
  countFailedScores: true,
  teamLives: 33
};
const createGame3DiscordRequest: DiscordRequestDto = {
  commType: "discord",
  authorId: "tester1",
  originChannelId: "tester1's amazing channel"
};

describe("When removing a lobby", function() {
  // this.beforeAll(function() {
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       return resolve();
  //     } catch (error) {
  //       return reject(error);
  //     }
  //   });
  // });

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
        assert.isDefined(createGame1Response);
        assert.isTrue(createGame1Response.success);

        // user 2 creates game 2
        const createGame2Response = await gameController.create({
          gameDto: game2,
          requestDto: createGame2DiscordRequest
        });
        assert.isDefined(createGame2Response);
        assert.isTrue(createGame2Response.success);

        // user 1 creates game 3
        const createGame3Response = await gameController.create({
          gameDto: game3,
          requestDto: createGame3DiscordRequest
        });
        assert.isDefined(createGame3Response);
        assert.isTrue(createGame3Response.success);
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
        await TestHelpers.dropTestDatabase();
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should disassociate a Lobby from a Game when sending a remove-lobby request", function() {
    return new Promise(async (resolve, reject) => {
      try {
        // create 3 games (created during the beforeEach)

        // add the same bancho mp id to all 3 games
        const lobbyDto1: AddLobbyDto = {
          banchoMultiplayerId: "54078930", // replace this with a valid mp id if it expires
          gameId: 1
        };
        const lobbyDto2: AddLobbyDto = {
          banchoMultiplayerId: "54078930", // replace this with a valid mp id if it expires
          gameId: 2
        };
        const lobbyDto3: AddLobbyDto = {
          banchoMultiplayerId: "54078930", // replace this with a valid mp id if it expires
          gameId: 3
        };
        const clock: InstalledClock = lolex.install();
        const lobbyController = iocContainer.get(LobbyController);
        const lobbyAddResponse1 = await lobbyController.create({
          lobbyDto: lobbyDto1,
          requestDto: createGame1DiscordRequest
        });
        const lobbyAddResponse2 = await lobbyController.create({
          lobbyDto: lobbyDto2,
          requestDto: createGame2DiscordRequest
        });
        const lobbyAddResponse3 = await lobbyController.create({
          lobbyDto: lobbyDto3,
          requestDto: createGame3DiscordRequest
        });
        clock.uninstall();

        // ensure that all lobby-add requests completed successfully
        assert.isTrue(lobbyAddResponse1 && lobbyAddResponse1.success);
        assert.isTrue(lobbyAddResponse2 && lobbyAddResponse2.success);
        assert.isTrue(lobbyAddResponse3 && lobbyAddResponse3.success);

        // fetch the Lobby with games included
        const lobbyRepository = getCustomRepository(LobbyRepository);
        const lobbyAfterAdds = await lobbyRepository.findOne(
          { banchoMultiplayerId: lobbyDto1.banchoMultiplayerId },
          { relations: ["games", "games.lobbies", "addedBy", "addedBy.discordUser"] }
        );
        assert.isDefined(lobbyAfterAdds.games);
        assert.lengthOf(lobbyAfterAdds.games, 3, "The lobby should have been added for 3 games.");
        assert.equal(lobbyAfterAdds.games[0].id, lobbyDto1.gameId, "The 1st lobby-game should be the game targeted by the 1st request.");
        assert.equal(lobbyAfterAdds.games[1].id, lobbyDto2.gameId, "The 2nd lobby-game should be the game targeted by the 2nd request.");
        assert.equal(lobbyAfterAdds.games[2].id, lobbyDto3.gameId, "The 3rd lobby-game should be the game targeted by the 3rd request.");

        // remove the bancho mp id from game #2
        const removeLobbyDto: RemoveLobbyDto = {
          banchoMultiplayerId: lobbyDto2.banchoMultiplayerId,
          gameId: lobbyDto2.gameId
        };
        const lobbyRemoveResponse = await lobbyController.remove({ lobbyDto: removeLobbyDto, requestDto: createGame2DiscordRequest });

        // assert that the Lobby for the bancho mp id only contains games 1 and 3
        assert.isTrue(lobbyRemoveResponse && lobbyRemoveResponse.success);
        const lobbyAfterRemoval = await lobbyRepository.findOne(
          { banchoMultiplayerId: lobbyDto1.banchoMultiplayerId },
          { relations: ["games", "games.lobbies", "addedBy", "addedBy.discordUser"] }
        );
        assert.isDefined(lobbyAfterRemoval.games);
        assert.lengthOf(lobbyAfterRemoval.games, 2, "There should be exactly one fewer game associated with the lobby than before.");
        assert.equal(lobbyAfterRemoval.games[0].id, lobbyDto1.gameId, "The 1st lobby-game should be the game targeted by the 1st request.");
        assert.equal(lobbyAfterRemoval.games[1].id, lobbyDto3.gameId, "The 2nd lobby-game should be the game targeted by the 3rd request.");

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it(
    "should update the status of a lobby to STOPPED_WATCHING after sending a valid " +
      "remove-lobby request, when the lobby is no longer being watched for any games",
    function() {
      return new Promise(async (resolve, reject) => {
        try {
          // add lobby
          const lobbyDto1: AddLobbyDto = {
            banchoMultiplayerId: "54078930", // replace this with a valid mp id if it expires
            gameId: 1
          };
          const clock: InstalledClock = lolex.install();
          const lobbyController = iocContainer.get(LobbyController);
          const lobbyAddResponse1 = await lobbyController.create({
            lobbyDto: lobbyDto1,
            requestDto: createGame1DiscordRequest
          });
          clock.uninstall();
          assert.isTrue(lobbyAddResponse1 && lobbyAddResponse1.success, "The lobby-add-request did not complete successfully.");

          // remove the bancho mp id from game #1
          const removeLobbyDto: RemoveLobbyDto = {
            banchoMultiplayerId: lobbyDto1.banchoMultiplayerId,
            gameId: lobbyDto1.gameId
          };
          const lobbyRemoveResponse = await lobbyController.remove({ lobbyDto: removeLobbyDto, requestDto: createGame1DiscordRequest });
          assert.isTrue(lobbyRemoveResponse && lobbyRemoveResponse.success);

          // assert lobby status
          const lobbyAfterRemoval = await Lobby.findOne({ banchoMultiplayerId: lobbyDto1.banchoMultiplayerId }, { relations: [] });
          assert.isDefined(lobbyAfterRemoval);
          assert.equal(lobbyAfterRemoval.status, LobbyStatus.STOPPED_WATCHING.getKey());

          return resolve();
        } catch (error) {
          return reject(error);
        }
      });
    }
  );

  it("should NOT update the lobby status when removing a lobby that still belongs to at least one game (still watching)", function() {
    return new Promise(async (resolve, reject) => {
      try {
        // add 2 lobbies
        const lobbyDto1: AddLobbyDto = {
          banchoMultiplayerId: "54078930", // replace this with a valid mp id if it expires
          gameId: 1
        };
        const lobbyDto2: AddLobbyDto = {
          banchoMultiplayerId: "54078930", // replace this with a valid mp id if it expires
          gameId: 2
        };
        const clock: InstalledClock = lolex.install();
        const lobbyController = iocContainer.get(LobbyController);
        const lobbyAddResponse1 = await lobbyController.create({
          lobbyDto: lobbyDto1,
          requestDto: createGame1DiscordRequest
        });
        const lobbyAddResponse2 = await lobbyController.create({
          lobbyDto: lobbyDto2,
          requestDto: createGame2DiscordRequest
        });
        clock.uninstall();
        assert.isTrue(lobbyAddResponse1 && lobbyAddResponse1.success);
        assert.isTrue(lobbyAddResponse2 && lobbyAddResponse2.success);

        // fetch the saved lobbies
        const lobby1 = await Lobby.findOne({ banchoMultiplayerId: lobbyDto1.banchoMultiplayerId }, { relations: [] });
        const lobby2 = await Lobby.findOne({ banchoMultiplayerId: lobbyDto2.banchoMultiplayerId }, { relations: [] });
        assert.isDefined(lobby1);
        assert.isDefined(lobby2);

        // remove the bancho mp id from game #2
        const removeLobbyDto: RemoveLobbyDto = {
          banchoMultiplayerId: lobbyDto2.banchoMultiplayerId,
          gameId: lobbyDto2.gameId
        };
        const lobbyRemoveResponse = await lobbyController.remove({ lobbyDto: removeLobbyDto, requestDto: createGame2DiscordRequest });
        assert.isTrue(lobbyRemoveResponse && lobbyRemoveResponse.success);

        // even though the lobby was removed from game #2, the lobby should still have "awaiting first scan" status, because it still belongs to game #1
        const lobbyAfterRemoval = await Lobby.findOne({ banchoMultiplayerId: lobbyDto1.banchoMultiplayerId }, { relations: [] });
        assert.isDefined(lobbyAfterRemoval);
        assert.equal(lobbyAfterRemoval.status, LobbyStatus.AWAITING_FIRST_SCAN.getKey());

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  // it("should deny a lobby-removal when the requesting-user does not have permission", function() {
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       return resolve();
  //     } catch (error) {
  //       return reject(error);
  //     }
  //   });
  // });

  // it("should receive an error message when trying to remove a Lobby when the Lobby was not one of the lobbies of a game", function() {
  //   return new Promise((resolve, reject) => {
  //     try {
  //       // test with no game id provided (should use the game id of the most-recently created game by the requesting-user)
  //       // test with a specific game id provided
  //       return resolve();
  //     } catch (error) {
  //       return reject(error);
  //     }
  //   });
  // });

  // it("should receive an error message when trying to remove a Lobby from a non-existent game", function() {
  //   return new Promise((resolve, reject) => {
  //     try {
  //       return resolve();
  //     } catch (error) {
  //       return reject(error);
  //     }
  //   });
  // });
});
