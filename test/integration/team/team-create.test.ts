import "../../../src/index";
import "mocha";
import { assert, expect } from "chai";
import { TestHelpers } from "../../test-helpers";
import { AddTeamsDto } from "../../../src/domain/team/dto/add-team.dto";
import { DiscordRequestDto } from "../../../src/requests/dto";
import iocContainer from "../../../src/inversify.config";
import { TeamController } from "../../../src/domain/team/team.controller";
import TYPES from "../../../src/types";
import { CreateGameDto } from "../../../src/domain/game/dto";
import { GameController } from "../../../src/domain/game/game.controller";
import { DiscordUserReportProperties } from "../../../src/domain/shared/reports/discord-user-report-properties";

describe("When adding teams to a game", function() {
  this.beforeEach(function() {
    return new Promise(async (resolve, reject) => {
      try {
        await TestHelpers.dropTestDatabase();
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should add a team and confirm that the add-team report contains the correct information", function() {
    return new Promise(async (resolve, reject) => {
      try {
        const gameController = iocContainer.get<GameController>(TYPES.GameController);
        const teamController = iocContainer.get<TeamController>(TYPES.TeamController);

        const createGameDto: CreateGameDto = {};
        const addTeamsDto: AddTeamsDto = {
          osuUsernamesOrIdsOrSeparators: ["3336000"]
        };
        const requestDto: DiscordRequestDto = {
          commType: "discord",
          authorId: "tester",
          originChannelId: "tester's amazing channel"
        };

        const createGameResponse = await gameController.create({ gameDto: createGameDto, requestDto: requestDto });
        expect(createGameResponse.success).to.be.true;
        const addTeamsResponse = await teamController.create({ teamDto: addTeamsDto, requestDto: requestDto });
        expect(addTeamsResponse.success).to.be.true;

        const addTeamsReport = addTeamsResponse.result;
        const addedBy = addTeamsReport.addedBy as DiscordUserReportProperties;
        expect(addTeamsReport.teams).to.have.lengthOf(1);
        expect(addTeamsReport.teams[0].teamId).to.be.greaterThan(0);
        expect(addTeamsReport.teams[0].teamOsuUsernames).to.have.lengthOf(1);
        expect(addedBy).to.not.be.undefined.and.be.not.null;
        expect(addedBy.discordUserId).to.equal(requestDto.authorId);
        expect(addTeamsReport.addedAgo).to.not.be.undefined.and.be.not.null;
        expect(addTeamsReport.addedAgo).to.have.lengthOf.greaterThan(1);

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should add a team of one player to a game", function() {
    return new Promise(async (resolve, reject) => {
      try {
        const gameController = iocContainer.get<GameController>(TYPES.GameController);
        const teamController = iocContainer.get<TeamController>(TYPES.TeamController);
        const createGameDto: CreateGameDto = {};
        const addTeamsDto: AddTeamsDto = {
          osuUsernamesOrIdsOrSeparators: ["3336000"]
        };
        const requestDto: DiscordRequestDto = {
          commType: "discord",
          authorId: "tester",
          originChannelId: "tester's amazing channel"
        };

        const createGameResponse = await gameController.create({ gameDto: createGameDto, requestDto: requestDto });
        expect(createGameResponse.success).to.be.true;
        const addTeamsResponse = await teamController.create({ teamDto: addTeamsDto, requestDto: requestDto });
        expect(addTeamsResponse.success).to.be.true;
        const addTeamsReport = addTeamsResponse.result;
        expect(addTeamsReport.teams).to.have.lengthOf(1);
        expect(addTeamsReport.teams[0].teamOsuUsernames).to.have.lengthOf(1);

        // TODO: Assert database state

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should add a team of two players to a game", function() {
    return new Promise(async (resolve, reject) => {
      try {
        const gameController = iocContainer.get<GameController>(TYPES.GameController);
        const teamController = iocContainer.get<TeamController>(TYPES.TeamController);
        const createGameDto: CreateGameDto = {};
        const addTeamsDto: AddTeamsDto = {
          osuUsernamesOrIdsOrSeparators: ["3336000", "3336001"]
        };
        const requestDto: DiscordRequestDto = {
          commType: "discord",
          authorId: "tester",
          originChannelId: "tester's amazing channel"
        };

        const createGameResponse = await gameController.create({ gameDto: createGameDto, requestDto: requestDto });
        expect(createGameResponse.success).to.be.true;
        const addTeamsResponse = await teamController.create({ teamDto: addTeamsDto, requestDto: requestDto });
        expect(addTeamsResponse.success).to.be.true;
        const addTeamsReport = addTeamsResponse.result;
        expect(addTeamsReport.teams).to.have.lengthOf(1);
        expect(addTeamsReport.teams[0].teamOsuUsernames).to.have.lengthOf(2);

        // TODO: Assert database state

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should add two teams of one player to a game", function() {
    return new Promise(async (resolve, reject) => {
      try {
        const gameController = iocContainer.get<GameController>(TYPES.GameController);
        const teamController = iocContainer.get<TeamController>(TYPES.TeamController);
        const createGameDto: CreateGameDto = {};
        const addTeamsDto: AddTeamsDto = {
          osuUsernamesOrIdsOrSeparators: ["3336000", "|", "3336001"]
        };
        const requestDto: DiscordRequestDto = {
          commType: "discord",
          authorId: "tester",
          originChannelId: "tester's amazing channel"
        };

        const createGameResponse = await gameController.create({ gameDto: createGameDto, requestDto: requestDto });
        expect(createGameResponse.success).to.be.true;
        const addTeamsResponse = await teamController.create({ teamDto: addTeamsDto, requestDto: requestDto });
        expect(addTeamsResponse.success).to.be.true;
        const addTeamsReport = addTeamsResponse.result;
        expect(addTeamsReport.teams).to.have.lengthOf(2);
        expect(addTeamsReport.teams[0].teamOsuUsernames).to.have.lengthOf(1);
        expect(addTeamsReport.teams[1].teamOsuUsernames).to.have.lengthOf(1);

        // TODO: Assert database state

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should add two teams of two players to a game", function() {
    return new Promise(async (resolve, reject) => {
      try {
        const gameController = iocContainer.get<GameController>(TYPES.GameController);
        const teamController = iocContainer.get<TeamController>(TYPES.TeamController);
        const createGameDto: CreateGameDto = {};
        const addTeamsDto: AddTeamsDto = {
          osuUsernamesOrIdsOrSeparators: ["3336000", "3336001", "|", "3336002", "3336003"]
        };
        const requestDto: DiscordRequestDto = {
          commType: "discord",
          authorId: "tester",
          originChannelId: "tester's amazing channel"
        };

        const createGameResponse = await gameController.create({ gameDto: createGameDto, requestDto: requestDto });
        expect(createGameResponse.success).to.be.true;
        const addTeamsResponse = await teamController.create({ teamDto: addTeamsDto, requestDto: requestDto });
        expect(addTeamsResponse.success).to.be.true;
        const addTeamsReport = addTeamsResponse.result;
        expect(addTeamsReport.teams).to.have.lengthOf(2);
        expect(addTeamsReport.teams[0].teamOsuUsernames).to.have.lengthOf(2);
        expect(addTeamsReport.teams[1].teamOsuUsernames).to.have.lengthOf(2);

        // TODO: Assert database state
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });
  it("should add the same team from game 1 to game 2", function() {
    return new Promise(async (resolve, reject) => {
      try {
        return reject();
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });
  it("should add two teams of different sizes to a game", function() {
    return new Promise(async (resolve, reject) => {
      try {
        return reject();
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });
  it("should add a large team to a game (50 players)", function() {
    return new Promise(async (resolve, reject) => {
      try {
        return reject();
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should add some teams to a game and assign a unique team color to each team for that game", function() {
    return new Promise(async (resolve, reject) => {
      try {
        return reject();
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });
  it("should fail to create any teams if the requesting user has not created a game", function() {
    return new Promise(async (resolve, reject) => {
      try {
        return reject();
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });
  it("should fail to create a team if the requesting user does not have permission", function() {
    return new Promise(async (resolve, reject) => {
      try {
        return reject();
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });
  it("should fail to create a team if a player of that team is already in a team for the game", function() {
    return new Promise(async (resolve, reject) => {
      try {
        return reject();
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });
  it("should fail to create any teams if any player exists in more than one of the requested teams", function() {
    return new Promise(async (resolve, reject) => {
      try {
        return reject();
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });
  it("should fail to create any teams when attempting to add two identical teams", function() {
    return new Promise(async (resolve, reject) => {
      try {
        return reject();
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });
});
