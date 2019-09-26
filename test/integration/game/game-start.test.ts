import "../../../src/startup";
import "mocha";
import { assert, expect } from "chai";
import { TestHelpers, TestContextEntities } from "../../test-helpers";
import iocContainer from "../../../src/inversify.config";
import { CreateGameDto } from "../../../src/domain/game/dto";
import { GameController } from "../../../src/domain/game/game.controller";
import { DiscordRequestDto } from "../../../src/requests/dto/discord-request.dto";
import { Game } from "../../../src/domain/game/game.entity";
import { User } from "../../../src/domain/user/user.entity";
import { GameStatus } from "../../../src/domain/game/game-status";
import { DiscordUser } from "../../../src/domain/user/discord-user.entity";
import { DiscordUserReportProperties } from "../../../src/domain/shared/reports/discord-user-report-properties";
import { GameService } from "../../../src/domain/game/game.service";
import { fail } from "assert";
import { Message } from "../../../src/utils/message";
import TYPES from "../../../src/types";
import { IDbClient } from "../../../src/database/db-client";
import { Connection } from "typeorm";
import { StartGameDto } from "../../../src/domain/game/dto/start-game.dto";
import { StartGameReport } from "../../../src/domain/game/reports/start-game.report";

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

describe("When starting a game", function() {
  this.beforeEach(function() {
    return new Promise(async (resolve, reject) => {
      try {
        const conn = await iocContainer.get<IDbClient>(TYPES.IDbClient).connect();
        await TestHelpers.loadAll(getEntities(conn), conn);

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

  it("should receive an accurate start-game report after starting a game", function() {
    return new Promise(async (resolve, reject) => {
      try {
        const gameController = iocContainer.get<GameController>(TYPES.GameController);
        const startGameDto: StartGameDto = { gameId: 1 };
        const startGameResponse = await gameController.startGame({ startGameDto: startGameDto, requestDto: createGame1DiscordRequest });

        // Assert game report has the expected values.
        assert.equal(startGameResponse.message, Message.get("gameStartSuccess"));
        const startGameReport: StartGameReport = startGameResponse.result;
        assert.isDefined(startGameReport.gameId);
        assert.isDefined(startGameReport.startedAgo);
        expect(startGameReport.startedAgo).to.have.lengthOf.at.least(1);
        assert.isDefined(startGameReport.startedBy);
        const startedByDiscordUser = startGameReport.startedBy as DiscordUserReportProperties;
        assert.equal(
          startedByDiscordUser.discordUserId,
          createGame1DiscordRequest.authorId,
          "The start-game report should reflect that it was started by the same Discord user ID as user 1."
        );

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should start a game and ensure its status is correct", function() {
    return new Promise(async (resolve, reject) => {
      try {
        const gameController = iocContainer.get<GameController>(TYPES.GameController);
        const gameService = iocContainer.get<GameService>(TYPES.GameService);
        const startGameDto: StartGameDto = { gameId: 1 };

        // ensure the just-created game has the correct status
        const createGameResponse = await gameService.findGameById(startGameDto.gameId);
        assert.isDefined(createGameResponse);
        assert.isTrue(createGameResponse.succeeded());
        const createdGame = createGameResponse.value as Game;
        assert.isTrue(GameStatus.isEndable(createdGame.status), "A newly created game should be endable.");
        assert.isFalse(GameStatus.isEndedStatus(createdGame.status));
        assert.isTrue(GameStatus.isNewGameStatus(createdGame.status));
        assert.isTrue(GameStatus.isStartable(createdGame.status), "A newly created game should be startable.");
        assert.isFalse(GameStatus.isStartedStatus(createdGame.status));

        // the same Discord user that created the game starts the game
        const startGameResponse = await gameController.startGame({ startGameDto: startGameDto, requestDto: createGame1DiscordRequest });
        assert.isNotNull(startGameResponse);
        assert.isTrue(startGameResponse.success);

        // reload the now-started game and assert its status
        const startedGameResponse = await gameService.findGameById(startGameDto.gameId);
        assert.isTrue(startedGameResponse.succeeded());
        const startedGame = startedGameResponse.value as Game;
        assert.isFalse(GameStatus.isStartable(startedGame.status), "A started game should not be startable.");
        assert.isTrue(GameStatus.isStartedStatus(startedGame.status));
        assert.isFalse(GameStatus.isNewGameStatus(startedGame.status));
        assert.isFalse(GameStatus.isEndable(startedGame.status), "A started game should not be endable.");
        assert.isFalse(GameStatus.isEndedStatus(startedGame.status));

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  // it("should start a game requested by a game referee", function() {
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       return resolve();
  //     } catch (error) {
  //       return reject(error);
  //     }
  //   });
  // });

  it("should fail to start a game that has already been started", function() {
    return new Promise(async (resolve, reject) => {
      try {
        const gameController = iocContainer.get<GameController>(TYPES.GameController);
        const startGameDto: StartGameDto = { gameId: 1 };

        // user 1 starts the game
        const startGameResponse1 = await gameController.startGame({ startGameDto: startGameDto, requestDto: createGame1DiscordRequest });
        assert.isNotNull(startGameResponse1);
        assert.isTrue(startGameResponse1.success);

        // user 1 attempts to start the same game again
        const startGameResponse2 = await gameController.startGame({ startGameDto: startGameDto, requestDto: createGame1DiscordRequest });
        assert.isNotNull(startGameResponse2);
        assert.isFalse(startGameResponse2.success);
        assert.isDefined(startGameResponse2.errors);
        assert.isDefined(startGameResponse2.errors.messages);
        assert.isTrue(startGameResponse2.errors.messages.length > 0, "The start-game response should contain some error messages.");

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should fail to start a game by a user lacking sufficient permission", function() {
    return new Promise(async (resolve, reject) => {
      try {
        const gameController = iocContainer.get<GameController>(TYPES.GameController);
        const startGameDto: StartGameDto = { gameId: 1 };

        // user 2 attempts to start game 1 created by user 1
        const startGameResponse1 = await gameController.startGame({ startGameDto: startGameDto, requestDto: createGame2DiscordRequest });
        assert.isNotNull(startGameResponse1);
        assert.equal(startGameResponse1.message, Message.get("gameStartFailed"));

        // user 2 should not have permission to start game 1
        assert.isFalse(startGameResponse1.success);
        assert.isDefined(startGameResponse1.errors);
        assert.isDefined(startGameResponse1.errors.messages);
        assert.isTrue(startGameResponse1.errors.messages.length > 0, "The start-game response should contain some error messages.");

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should fail to start a game that does not exist", function() {
    return new Promise(async (resolve, reject) => {
      try {
        const gameController = iocContainer.get<GameController>(TYPES.GameController);
        const startGameDto: StartGameDto = { gameId: 99999999 };

        const startGameResponse1 = await gameController.startGame({ startGameDto: startGameDto, requestDto: createGame1DiscordRequest });
        assert.isNotNull(startGameResponse1);
        assert.isFalse(startGameResponse1.success);
        assert.equal(startGameResponse1.message, Message.get("gameStartFailed"));

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should fail to start a game with validation errors", function() {
    return new Promise(async (resolve, reject) => {
      try {
        const gameController = iocContainer.get<GameController>(TYPES.GameController);
        const startGameDto: StartGameDto = { gameId: 1.5 };

        const startGameResponse1 = await gameController.startGame({ startGameDto: startGameDto, requestDto: createGame1DiscordRequest });
        assert.isNotNull(startGameResponse1);
        assert.isFalse(startGameResponse1.success);
        assert.equal(startGameResponse1.message, Message.get("gameStartFailed"));
        assert.isDefined(startGameResponse1.errors);
        assert.isDefined(startGameResponse1.errors.validation);
        assert.isTrue(
          startGameResponse1.errors.validation.length > 0,
          "The start-game response should contain some validation error messages."
        );

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  // it("should start watching all added-lobbies when a game is started", function() {
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       return resolve();
  //     } catch (error) {
  //       return reject(error);
  //     }
  //   });
  // });
});
