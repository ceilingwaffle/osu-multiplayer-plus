import "../../src/index";
import "mocha";
import { assert, expect } from "chai";
import { TestHelpers, TestContextEntities } from "../test-helpers";
import iocContainer from "../../src/inversify.config";
import { CreateGameDto, EndGameDto } from "../../src/domain/game/dto";
import { GameController } from "../../src/domain/game/game.controller";
import { DiscordRequestDto } from "../../src/requests/dto/discord-request.dto";
import { Game } from "../../src/domain/game/game.entity";
import { User } from "../../src/domain/user/user.entity";
import { GameStatus } from "../../src/domain/game/game-status";
import { ConnectionManager } from "../../src/utils/connection-manager";
import { DiscordUser } from "../../src/domain/user/discord-user.entity";
import { UpdateGameReport } from "../../src/domain/game/reports/update-game.report";
import { DiscordUserReportProperties } from "../../src/domain/shared/reports/discord-user-report-properties";
import { GameDefaults } from "../../src/domain/game/game-defaults";
import { GameMessageTarget } from "../../src/domain/game/game-message-target";
import { UserGameRole } from "../../src/domain/role/user-game-role.entity";
import { EndGameReport } from "../../src/domain/game/reports/end-game.report";
import { GameService } from "../../src/domain/game/game.service";
import { success } from "../../src/utils/either";
import { fail } from "assert";
import { GameRepository } from "../../src/domain/game/game.repository";
import { Message } from "../../src/utils/message";

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

describe("When ending a game", function() {
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
        await TestHelpers.dropTestDatabase();
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should receive an accurate end-game report after ending a game", function() {
    return new Promise(async (resolve, reject) => {
      try {
        const gameController = iocContainer.get(GameController);
        const endGameDto: EndGameDto = { gameId: 1 };
        const endGameResponse = await gameController.endGame({ endGameDto: endGameDto, requestDto: createGame1DiscordRequest });

        // Assert game report has the expected values.
        // Note that the "endedBy" property is optional (e.g. if the game was ended by the system)
        // but in this case, the game was ended by a user, so we expect it to have some value about a User.
        assert.equal(endGameResponse.message, Message.get("gameEndSuccess"));
        const endGameReport = endGameResponse.result as EndGameReport;
        assert.isDefined(endGameReport.gameId);
        assert.isDefined(endGameReport.endedAgo);
        expect(endGameReport.endedAgo).to.have.lengthOf.at.least(1);
        assert.isDefined(endGameReport.endedBy);
        const addedByDiscordUser = endGameReport.endedBy as DiscordUserReportProperties;
        assert.equal(
          addedByDiscordUser.discordUserId,
          createGame1DiscordRequest.authorId,
          "The end-game report should reflect that it was ended by the same Discord user ID as user 1."
        );

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should end a game and ensure it was changed from an active-state to an ended-state", function() {
    return new Promise(async (resolve, reject) => {
      try {
        const gameController = iocContainer.get(GameController);
        const gameService = iocContainer.get(GameService);
        const endGameDto: EndGameDto = { gameId: 1 };

        // ensure the game is in a ready/active/non-ended state
        const activeGameResponse = await gameService.findGameById(endGameDto.gameId);
        assert.isDefined(activeGameResponse);
        assert.isTrue(activeGameResponse.succeeded());
        const activeGame = activeGameResponse.value as Game;
        assert.isTrue(gameService.isGameActive(activeGame), "The game is in an 'ended' state but it shouldn't be.");
        assert.isFalse(gameService.isGameEnded(activeGame), "The game is in an 'ended' state but it shouldn't be.");

        // the same Discord user ends the game
        const endGameResponse = await gameController.endGame({ endGameDto: endGameDto, requestDto: createGame1DiscordRequest });
        assert.isNotNull(endGameResponse);
        assert.isTrue(endGameResponse.success);

        // reload the now-ended game and assert its status
        const endedGameResponse = await gameService.findGameById(endGameDto.gameId);
        assert.isTrue(endedGameResponse.succeeded());
        const endedGame = endedGameResponse.value as Game;
        assert.isTrue(gameService.isGameEnded(endedGame), "The game is in an 'active' state but it shouldn't be.");
        assert.isFalse(gameService.isGameActive(endedGame), "The game is in an 'active' state but it shouldn't be.");

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should end a game and ensure it is now in a 'manually_ended' state", function() {
    return new Promise(async (resolve, reject) => {
      try {
        const gameController = iocContainer.get(GameController);
        const gameService = iocContainer.get(GameService);
        const endGameDto: EndGameDto = { gameId: 1 };

        // user 1 ends the game
        const endGameResponse = await gameController.endGame({ endGameDto: endGameDto, requestDto: createGame1DiscordRequest });
        assert.isNotNull(endGameResponse);
        assert.isTrue(endGameResponse.success);

        const foundGameResponse = await gameService.findGameById(endGameDto.gameId);
        assert.isDefined(foundGameResponse);
        assert.isTrue(foundGameResponse.succeeded());
        const game = foundGameResponse.value as Game;
        assert.equal(game.status, GameStatus.MANUALLY_ENDED.getKey(), `Game status was not ${GameStatus.MANUALLY_ENDED.getKey()}`);

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  // it("should end a game requested by a game referee", function() {
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       return resolve();
  //     } catch (error) {
  //       return reject(error);
  //     }
  //   });
  // });

  it("should fail to end a game that has already ended", function() {
    return new Promise(async (resolve, reject) => {
      try {
        const gameController = iocContainer.get(GameController);
        const gameService = iocContainer.get(GameService);
        const endGameDto: EndGameDto = { gameId: 1 };

        // user 1 ends the game
        const endGameResponse1 = await gameController.endGame({ endGameDto: endGameDto, requestDto: createGame1DiscordRequest });
        assert.isNotNull(endGameResponse1);
        assert.isTrue(endGameResponse1.success);

        // TODO: assert that GameService.endGame WAS called

        // user 1 attempts to end the same game again
        const endGameResponse2 = await gameController.endGame({ endGameDto: endGameDto, requestDto: createGame1DiscordRequest });
        assert.isNotNull(endGameResponse2);
        assert.isFalse(endGameResponse2.success);

        // TODO: assert that GameService.endGame WAS NOT called

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should fail to end a game by a user lacking sufficient permission", function() {
    return new Promise(async (resolve, reject) => {
      try {
        const gameController = iocContainer.get(GameController);
        const endGameDto: EndGameDto = { gameId: 1 };

        // user 2 attempts to end game 1 created by user 1
        const endGameResponse1 = await gameController.endGame({ endGameDto: endGameDto, requestDto: createGame2DiscordRequest });
        assert.isNotNull(endGameResponse1);
        assert.equal(endGameResponse1.message, Message.get("gameEndFailed"));

        // user 2 should not have permission to end game 1
        assert.isFalse(endGameResponse1.success);
        assert.isDefined(endGameResponse1.errors);
        assert.isDefined(endGameResponse1.errors.messages);
        assert.isTrue(endGameResponse1.errors.messages.length > 0, "End-game-response should contain some error messages.");

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should fail to end a game that does not exist", function() {
    return new Promise(async (resolve, reject) => {
      try {
        const gameController = iocContainer.get(GameController);
        const endGameDto: EndGameDto = { gameId: 99999999 };

        const endGameResponse1 = await gameController.endGame({ endGameDto: endGameDto, requestDto: createGame1DiscordRequest });
        assert.isNotNull(endGameResponse1);
        assert.isFalse(endGameResponse1.success);
        assert.equal(endGameResponse1.message, Message.get("gameEndFailed"));

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should fail to end a game with validation errors", function() {
    return new Promise(async (resolve, reject) => {
      try {
        const gameController = iocContainer.get(GameController);
        const endGameDto: EndGameDto = { gameId: 1.5 };

        const endGameResponse1 = await gameController.endGame({ endGameDto: endGameDto, requestDto: createGame1DiscordRequest });
        assert.isNotNull(endGameResponse1);
        assert.isFalse(endGameResponse1.success);
        assert.equal(endGameResponse1.message, Message.get("gameEndFailed"));
        assert.isDefined(endGameResponse1.errors);
        assert.isDefined(endGameResponse1.errors.validation);
        assert.isTrue(endGameResponse1.errors.validation.length > 0, "End-game-response should contain some validation error messages.");

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  // it("should stop watching a lobby when a game is ended", function() {
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       return resolve();
  //     } catch (error) {
  //       return reject(error);
  //     }
  //   });
  // });
});
