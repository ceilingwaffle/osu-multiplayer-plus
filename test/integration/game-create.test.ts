import "../../src/index";
import "mocha";
import { assert } from "chai";
import { TestHelpers, TestContextEntities } from "../TestHelpers";
import iocContainer from "../../src/inversify.config";
import { CreateGameDto } from "../../src/domain/game/dto";
import { GameController } from "../../src/domain/game/game.controller";
import { DiscordRequestDto } from "../../src/requests/dto/discord-request.dto";
import { Game } from "../../src/domain/game/game.entity";
import { User } from "../../src/domain/user/user.entity";
import { GameStatusType } from "../../src/domain/game/types/game-status-type";
import { ConnectionManager } from "../../src/utils/connection-manager";
import { DiscordUser } from "../../src/domain/user/discord-user.entity";

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
  this.beforeAll(function() {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          // Setup DB
          await ConnectionManager.getInstance();
          const entities = await getEntities();
          await TestHelpers.cleanAll(entities);
          // TODO: Assert empty tables: games, users
          resolve();
        } catch (error) {
          reject(error);
        }
      }, 5000);
    });
  });

  describe("with no values", function() {
    it("should save a new game from a create game request containing no values", function() {
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
          assert.isTrue(gameCreateResponse!.success);
          assert.isTrue(gameCreateResponse!.result instanceof Game);
          const savedGame = gameCreateResponse!.result as Game;
          assert.isNotNull(savedGame);
          assert.isNotNull(savedGame!.teamLives, "Expected some default value for game team lives.");
          assert.isNotNull(savedGame!.countFailedScores, "Expected some default value for game count failed scores.");

          return resolve();
        } catch (error) {
          reject(error);
          throw error;
        }
      });
    });
  });

  describe("with some values", function() {
    it("should save a new game from a create game request containing some values", function() {
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
          assert.isTrue(gameCreateResponse!.success);

          const savedGame = gameCreateResponse.result as Game;
          assert.equal(savedGame!.teamLives, gameDto.teamLives);
          assert.equal(savedGame!.countFailedScores, gameDto.countFailedScores);
          assert.equal(savedGame!.status, GameStatusType.IDLE, "New games created should have a game status of idle.");
          /* #endregion */

          /* #region  message target */
          assert.lengthOf(savedGame!.messageTargets, 1);

          let msgTarget: { type: any; authorId: any; channel?: string };
          msgTarget = savedGame!.messageTargets!.find(msgTarget => msgTarget.type === requestDto.type);
          assert.equal(msgTarget!.type, requestDto.type);

          msgTarget = savedGame!.messageTargets!.find(msgTarget => msgTarget.authorId === requestDto.authorId);
          assert.equal(msgTarget!.authorId, requestDto.authorId);

          msgTarget = savedGame!.messageTargets!.find(msgTarget => msgTarget.channel === requestDto.originChannel);
          assert.equal(msgTarget!.channel, requestDto.originChannel);
          /* #endregion */

          /* #region  game creator */
          assert.isNotNull(savedGame!.createdBy);
          assert.equal(savedGame!.createdBy!.discordUser!.discordUserId, requestDto.authorId);
          assert.lengthOf<User[]>(savedGame!.refereedBy, 1, "There should be exactly one game referee.");
          assert.lengthOf<User[]>(
            savedGame!.refereedBy!.filter(user => user.discordUser.discordUserId === requestDto.authorId),
            1,
            "The game referee should have the same discord author id as the one in the DTO."
          );
          /* #endregion */

          return resolve();
        } catch (error) {
          reject(error);
          throw error;
        }
      });
    });
  });

  this.afterAll(function() {
    // TODO: Teardown DB
  });
});
