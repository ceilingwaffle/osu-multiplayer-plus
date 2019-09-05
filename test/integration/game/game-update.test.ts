import "../../../src/index";
import "mocha";
import { assert, expect } from "chai";
import { TestHelpers, TestContextEntities } from "../../test-helpers";
import iocContainer from "../../../src/inversify.config";
import { CreateGameDto } from "../../../src/domain/game/dto";
import { GameController } from "../../../src/domain/game/game.controller";
import { DiscordRequestDto } from "../../../src/requests/dto/discord-request.dto";
import { Game } from "../../../src/domain/game/game.entity";
import { User } from "../../../src/domain/user/user.entity";
import { ConnectionManager } from "../../../src/utils/connection-manager";
import { DiscordUser } from "../../../src/domain/user/discord-user.entity";
import { UpdateGameDto } from "../../../src/domain/game/dto/update-game.dto";

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

describe("When updating a game", function() {
  this.beforeEach(function() {
    return TestHelpers.reloadEntities(getEntities());
  });

  this.afterAll(function() {
    // TODO: Teardown DB
  });

  it("should update the countFailedScores property to true of the most-recently created game of a user when no game ID is specified", function() {
    return new Promise(async (resolve, reject) => {
      try {
        const gameController = iocContainer.get(GameController);
        const createGameDto1: CreateGameDto = {
          countFailedScores: true
        };
        const createGameDto2: CreateGameDto = {
          countFailedScores: false
        };
        // don't include a gameId target in the update request so that the user's most-recently created game is used
        const updateGameDto: UpdateGameDto = {
          countFailedScores: true
        };
        const requestDto: DiscordRequestDto = {
          commType: "discord",
          authorId: "tester",
          originChannelId: "tester's amazing channel"
        };

        // create two games
        const gameCreateResponse1 = await gameController.create({ gameDto: createGameDto1, requestDto: requestDto });
        assert.isTrue(gameCreateResponse1 && gameCreateResponse1.success);
        const createGameReport1 = gameCreateResponse1.result;
        assert.isNotNull(createGameReport1);

        const gameCreateResponse2 = await gameController.create({ gameDto: createGameDto2, requestDto: requestDto });
        assert.isTrue(gameCreateResponse2 && gameCreateResponse2.success);
        const createGameReport2 = gameCreateResponse2.result;
        assert.isNotNull(createGameReport2);

        // assert created-game values
        assert.strictEqual(createGameReport1.gameId, 1, "The first game ID should equal 1");
        assert.strictEqual(createGameReport2.gameId, 2, "The second game ID should equal 2");
        assert.strictEqual(createGameReport2.countFailedScores, createGameDto2.countFailedScores);
        assert.notStrictEqual(
          createGameReport1.countFailedScores,
          createGameReport2.countFailedScores,
          "The two game creations should have different values for countFailedScores as defined in the two CreateGameDTOs."
        );

        // try to update the user's most recently created game (countFailedScores from false to true)
        const updateGameResponse = await gameController.update({ updateGameDto: updateGameDto, requestDto: requestDto });
        assert.isTrue(updateGameResponse && updateGameResponse.success);
        const updateGameReport = updateGameResponse.result;

        // assert expected updated-game values
        assert.strictEqual(updateGameReport.gameId, 2, "The user's most recently created game should have been the target of the update.");
        assert.strictEqual(updateGameReport.countFailedScores, updateGameDto.countFailedScores);

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should update the lives of a specific game ID", function() {
    return new Promise(async (resolve, reject) => {
      try {
        const gameController = iocContainer.get(GameController);
        const createGameDto: CreateGameDto = {
          teamLives: 1234,
          countFailedScores: false
        };
        const updateGameDto: UpdateGameDto = {
          teamLives: 5678,
          gameId: 1
        };
        const requestDto: DiscordRequestDto = {
          commType: "discord",
          authorId: "tester",
          originChannelId: "tester's amazing channel"
        };

        // create the game
        const gameCreateResponse = await gameController.create({ gameDto: createGameDto, requestDto: requestDto });
        assert.isTrue(gameCreateResponse && gameCreateResponse.success);
        const createGameReport = gameCreateResponse.result;
        assert.isNotNull(createGameReport);
        assert.strictEqual(createGameReport.teamLives, createGameDto.teamLives, "Game lives value is incorrect on the created game");

        // update the game
        const gameUpdateResponse = await gameController.update({ updateGameDto: updateGameDto, requestDto: requestDto });
        assert.isTrue(gameUpdateResponse && gameUpdateResponse.success);
        const updateGameReport = gameUpdateResponse.result;

        // assert expected update-game values
        assert.isNotNull(updateGameReport);
        assert.isNotNull(updateGameReport.teamLives, "Expected some default value for game team lives.");
        assert.strictEqual(
          updateGameReport.teamLives,
          updateGameDto.teamLives,
          "Game lives value was not updated when it should have been"
        );
        assert.isNotNull(updateGameReport.countFailedScores, "Expected some default value for game count failed scores.");
        assert.strictEqual(
          updateGameReport.countFailedScores,
          createGameDto.countFailedScores,
          "Game countFailedScores value was updated when it shouldn't have been"
        );
        assert.isNotEmpty(updateGameReport.createdAgo);
        assert.isNotEmpty(updateGameReport.createdBy);
        assert.isNotEmpty(updateGameReport.messageTargets);
        assert.isNotEmpty(updateGameReport.refereedBy);
        assert.isNotEmpty(updateGameReport.status);

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should fail to update a game with validation errors", function() {
    return new Promise(async (resolve, reject) => {
      try {
        const gameController = iocContainer.get(GameController);
        const createGameDto: CreateGameDto = {};
        const updateGameDto: UpdateGameDto = {
          gameId: 1,
          teamLives: 1.5 // should be a whole number
        };
        const requestDto: DiscordRequestDto = {
          commType: "discord",
          authorId: "tester",
          originChannelId: "tester's amazing channel"
        };

        // create the game
        const gameCreateResponse = await gameController.create({ gameDto: createGameDto, requestDto: requestDto });
        assert.isTrue(gameCreateResponse && gameCreateResponse.success);

        // update the game
        const gameUpdateResponse = await gameController.update({ updateGameDto: updateGameDto, requestDto: requestDto });
        assert.isDefined(gameUpdateResponse);

        // ensure update did not succeed due to validation errors
        assert.isFalse(gameUpdateResponse.success, "The response should indicate that the create game request did not succeed.");
        assert.isDefined(gameUpdateResponse.errors);
        assert.isNotNull(gameUpdateResponse.errors);
        expect(gameUpdateResponse.errors.validation).to.be.not.empty;

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });
});
