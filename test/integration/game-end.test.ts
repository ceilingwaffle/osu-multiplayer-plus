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
import { UserGameRole } from "../../src/domain/roles/user-game-role.entity";
import { EndGameReport } from "../../src/domain/game/reports/end-game.report";
import { GameService } from "../../src/domain/game/game.service";

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

// a Discord user creates a game to be ended
const createGameDto: CreateGameDto = {};
const requestDto: DiscordRequestDto = {
  commType: "discord",
  authorId: "tester",
  originChannelId: "tester's amazing channel"
};

describe("When ending a game", function() {
  this.beforeEach(function() {
    return TestHelpers.reloadEntities(getEntities());
  });

  this.afterAll(function() {
    // TODO: Teardown DB
  });

  // it("should receive an end-game-report after ending a game", function() {
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       // Assert game report has the expected values.
  //       // Note that the "endedBy" property is optional (e.g. if the game was ended by the system)
  //       // but in this case, the game was ended by a user, so we expect it to have some value about a User.
  //       const endGameReport = endGameResponse.result as EndGameReport;
  //       assert.isDefined(endGameReport.gameId);
  //       assert.isDefined(endGameReport.endedBy);
  //       assert.isDefined(endGameReport.endedAgo);
  //       return resolve();
  //     } catch (error) {
  //       return reject(error);
  //     }
  //   });
  // });

  it("should end a game that is in an active-state", function() {
    return new Promise(async (resolve, reject) => {
      try {
        const gameController = iocContainer.get(GameController);
        const gameCreateResponse = await gameController.create({ gameDto: createGameDto, requestDto: requestDto });
        assert.isNotNull(gameCreateResponse);
        assert.isTrue(gameCreateResponse.success);
        const createdGameReport: UpdateGameReport = gameCreateResponse.result;
        assert.isDefined(createdGameReport);

        // ensure the game is in a ready/active/non-ended state
        const gameService = iocContainer.get(GameService);
        const foundGameResponse = await gameService.findGameById(createdGameReport.gameId);
        assert.isDefined(foundGameResponse);
        assert.isTrue(foundGameResponse.succeeded);
        const game = foundGameResponse.value as Game;
        assert.isTrue(gameService.isGameActive(game), "The game is in an 'ended' state but it shouldn't be.");
        await gameService.updateGameStatusForGameEntity({ game, status: GameStatus.IDLE_NEWGAME });
        assert.isTrue(gameService.isGameActive(game), "The game is in an 'ended' state but it shouldn't be.");

        // the same Discord user ends the game
        const gameCreatedReport = gameCreateResponse.result;
        const endGameDto: EndGameDto = {
          gameId: gameCreatedReport.gameId
        };
        const endGameResponse = await gameController.endGame({ endGameDto: endGameDto, requestDto: requestDto });
        assert.isNotNull(endGameResponse);
        assert.isTrue(endGameResponse.success);

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  // it("should fail to end a game that is in a concluded-state", function() {
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       return resolve();
  //     } catch (error) {
  //       return reject(error);
  //     }
  //   });
  // });
});
