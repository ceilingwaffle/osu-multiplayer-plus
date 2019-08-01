import "../../src/index";
import "mocha";
import { assert, expect } from "chai";
import { TestHelpers, TestContextEntities } from "../test-helpers";
import iocContainer from "../../src/inversify.config";
import { CreateGameDto } from "../../src/domain/game/dto";
import { GameController } from "../../src/domain/game/game.controller";
import { DiscordRequestDto } from "../../src/requests/dto/discord-request.dto";
import { Game } from "../../src/domain/game/game.entity";
import { User } from "../../src/domain/user/user.entity";
import { GameStatus } from "../../src/domain/game/game-status";
import { ConnectionManager } from "../../src/utils/connection-manager";
import { DiscordUser } from "../../src/domain/user/discord-user.entity";
import { CreateGameReport } from "../../src/domain/game/reports/create-game.report";
import { DiscordUserReportProperties } from "../../src/domain/shared/reports/discord-user-report-properties";

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

describe("When creating a game", function() {
  this.beforeEach(function() {
    return TestHelpers.reloadEntities(getEntities());
  });

  this.afterAll(function() {
    // TODO: Teardown DB
  });

  it("should save a new game from a Discord request containing no specified game properties", function() {
    return new Promise(async (resolve, reject) => {
      try {
        const gameDto: CreateGameDto = {};
        const requestDto: DiscordRequestDto = {
          type: "discord",
          authorId: "tester",
          originChannel: "tester's amazing channel"
        };

        const gameController = iocContainer.get(GameController);
        const gameCreateResponse = await gameController.create({ gameDto: gameDto, requestDto: requestDto });
        assert.isNotNull(gameCreateResponse);
        assert.isTrue(gameCreateResponse.success);
        const savedGame = gameCreateResponse.result as CreateGameReport;
        assert.isNotNull(savedGame);
        assert.isNotNull(savedGame.teamLives, "Expected some default value for game team lives.");
        assert.isNotNull(savedGame.countFailedScores, "Expected some default value for game count failed scores.");

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should save a new game from a Discord request containing some game properties", function() {
    return new Promise(async (resolve, reject) => {
      try {
        const gameDto: CreateGameDto = {
          teamLives: 55,
          countFailedScores: false
        };
        const requestDto: DiscordRequestDto = {
          type: "discord",
          authorId: "tester",
          originChannel: "tester's amazing channel"
        };

        /* #region  game properties */
        const gameController = iocContainer.get(GameController);
        const gameCreateResponse = await gameController.create({ gameDto: gameDto, requestDto: requestDto });
        assert.isDefined(gameCreateResponse);
        assert.isTrue(gameCreateResponse.success);

        const gameReport = gameCreateResponse.result as CreateGameReport;
        expect(gameReport).to.not.be.undefined;
        expect(gameReport.status).to.equal(GameStatus.IDLE_NEWGAME.getText(), "New games should have an initial game status of idle.").but
          .not.be.null;
        expect(gameReport.teamLives).to.equal(gameDto.teamLives).but.not.be.null;
        expect(gameReport.countFailedScores).to.equal(gameDto.countFailedScores).but.not.be.null;
        /* #endregion */

        /* #region  message target */
        assert.isNotNull(gameReport.messageTargets);
        assert.lengthOf(gameReport.messageTargets, 1);

        let msgTarget: { type: any; authorId: any; channel?: string };
        msgTarget = gameReport.messageTargets.find(msgTarget => msgTarget.type === requestDto.type);
        assert.isDefined(msgTarget, "Game should have a message target contaning the expected request type (e.g. DiscordRequest).");
        assert.isNotNull(msgTarget.type);

        msgTarget = gameReport.messageTargets.find(msgTarget => msgTarget.authorId === requestDto.authorId);
        assert.isDefined(msgTarget, "Game should have a message target contaning the requester's author ID.");
        assert.isNotNull(msgTarget.authorId);

        msgTarget = gameReport.messageTargets.find(msgTarget => msgTarget.channel === requestDto.originChannel);
        assert.isDefined(msgTarget, "Game should have a message target contaning the channel where the request was initiated.");
        assert.isNotNull(msgTarget.channel);
        /* #endregion */

        /* #region  game creator */
        const gameCreator = gameReport.createdBy as DiscordUserReportProperties;
        assert.isNotNull(gameCreator);
        assert.isNotNull(gameCreator.discordUserId);
        const gameCreatorDiscordUserId = gameCreator.discordUserId;
        expect(gameCreatorDiscordUserId).to.equal(requestDto.authorId);
        expect(gameReport.refereedBy).to.have.length(1, "There should be exactly one game referee.");
        const gameRefs = (gameReport.refereedBy as DiscordUserReportProperties[]).filter(
          user => user.discordUserId === requestDto.authorId
        );
        expect(gameRefs).to.have.length(1, "The game referee should have the same discord author id as the one in the DTO.");
        /* #endregion */

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should not save a game with validation errors", function() {
    return new Promise(async (resolve, reject) => {
      try {
        const gameDto: CreateGameDto = {
          teamLives: 1.5 // should be a whole number
        };
        const requestDto: DiscordRequestDto = {
          type: "discord",
          authorId: "tester",
          originChannel: "tester's amazing channel"
        };

        const gameController = iocContainer.get(GameController);
        const gameCreateResponse = await gameController.create({ gameDto: gameDto, requestDto: requestDto });

        assert.isFalse(gameCreateResponse.success, "The response should indicate that the create game request did not succeed.");
        assert.isDefined(gameCreateResponse.errors);
        assert.isNotNull(gameCreateResponse.errors);

        expect(gameCreateResponse.errors.validation).to.be.not.empty;

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });
});
