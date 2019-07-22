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
import { GameStatusType } from "../../src/domain/game/types/game-status.type";

async function getEntities(): Promise<TestContextEntities[]> {
  return [{ name: "User", tableName: "users", values: [] }, { name: "Game", tableName: "games", values: [] }];
}

describe("When creating a game", function() {
  this.beforeAll(function() {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          // Setup DB
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
    it("should save a new game with default values when the game request was assigned no values", function() {
      return new Promise(async (resolve, reject) => {
        try {
          const gameDto: CreateGameDto = {};
          const requestDto: DiscordRequestDto = {
            type: "discord",
            authorId: "waffle",
            originChannel: "waffle's amazing channel"
          };

          const gameController = iocContainer.get(GameController);
          const gameCreateResponse = await gameController.create({ gameDto: gameDto, requestDto: requestDto });
          assert.isDefined(gameCreateResponse);
          assert.isTrue(gameCreateResponse.success);
          assert.isTrue(gameCreateResponse.result instanceof Game);
          const savedGame = gameCreateResponse.result as Game;
          assert.isNotNull(savedGame);
          assert.isNotNull(savedGame.teamLives, "Expected some default value for game team lives.");
          assert.isNotNull(savedGame.countFailedScores, "Expected some default value for game count failed scores.");

          return resolve();
        } catch (error) {
          reject(error);
          throw error;
        }
      });
    });
  });

  describe("with some values", function() {
    it("should save a new game after creating and saving a user from the Discord requester", function() {
      return new Promise(async (resolve, reject) => {
        try {
          const gameDto: CreateGameDto = {
            teamLives: 2,
            countFailedScores: true
          };
          const requestDto: DiscordRequestDto = {
            type: "discord",
            authorId: "waffle",
            originChannel: "waffle's amazing channel"
          };

          const gameController = iocContainer.get(GameController);
          const gameCreateResponse = await gameController.create({ gameDto: gameDto, requestDto: requestDto });
          assert.isDefined(gameCreateResponse);
          assert.isTrue(gameCreateResponse.success);

          const savedGame = gameCreateResponse.result as Game;
          assert.isNotNull(savedGame);
          assert.equal(savedGame.teamLives, gameDto.teamLives);
          assert.equal(savedGame.countFailedScores, gameDto.countFailedScores);
          assert.equal(savedGame.status.text, GameStatusType.IDLE, "New games created should have a game status of idle.");
          assert.lengthOf(savedGame.messageTargets, 1);
          assert.isDefined(savedGame.messageTargets.find(msgTarget => msgTarget.channel === requestDto.originChannel));
          assert.isNotNull(savedGame.createdBy);
          assert.equal(savedGame.createdBy.discordUser.discordUserId, requestDto.authorId);
          assert.lengthOf<User[]>(savedGame.refereedBy, 1, "There should be exactly one game referee.");
          assert.lengthOf<User[]>(
            savedGame.refereedBy.filter(user => user.discordUser.discordUserId === requestDto.authorId),
            1,
            "The game referee should have the same discord author id as the one in the DTO."
          );

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
