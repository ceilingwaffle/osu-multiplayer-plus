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
import { getCustomRepository } from "typeorm";
import { TeamRepository } from "../../../src/domain/team/team.repository";
import { Team } from "../../../src/domain/team/team.entity";
import { Helpers } from "../../../src/utils/helpers";

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
        // arrange
        const inTeams: string[][] = [["3336000"]];
        const allUserIds = Helpers.flatten2Dto1D(inTeams);
        const createGameDto: CreateGameDto = {};
        const addTeamsDto: AddTeamsDto = {
          osuUsernamesOrIdsOrSeparators: TestHelpers.convertToTeamDtoArgFormat(inTeams)
        };
        const requestDto: DiscordRequestDto = {
          commType: "discord",
          authorId: "tester",
          originChannelId: "tester's amazing channel"
        };

        // act
        const gameController = iocContainer.get<GameController>(TYPES.GameController);
        const teamController = iocContainer.get<TeamController>(TYPES.TeamController);
        const createGameResponse = await gameController.create({ gameDto: createGameDto, requestDto: requestDto });
        expect(createGameResponse.success).to.be.true;
        const addTeamsResponse = await teamController.create({ teamDto: addTeamsDto, requestDto: requestDto });
        expect(addTeamsResponse.success).to.be.true;
        const addTeamsReport = addTeamsResponse.result;

        // assert state of teams report
        expect(addTeamsReport.teams).to.have.lengthOf(1);
        expect(addTeamsReport.teams[0].teamOsuUsernames).to.have.lengthOf(1);

        // assert state of database
        const teamRepository = getCustomRepository(TeamRepository);
        const [teamResults, totalTeams]: [Team[], number] = await teamRepository.findAndCount({
          relations: [
            "createdBy",
            "createdBy.discordUser",
            "teamOsuUsers",
            "teamOsuUsers.osuUser",
            "gameTeams",
            "gameTeams.addedBy",
            "gameTeams.addedBy.discordUser"
          ]
        });
        expect(totalTeams).to.equal(1);
        const team1 = teamResults[0];
        expect(team1.createdBy.discordUser.discordUserId).to.equal(requestDto.authorId);
        expect(team1.gameTeams).to.have.lengthOf(1);
        expect(team1.gameTeams[0].addedBy.discordUser.discordUserId).to.equal(requestDto.authorId);
        expect(team1.gameTeams[0].teamNumber).to.equal(1);
        expect(team1.teamOsuUsers).to.have.lengthOf(1);
        expect(team1.teamOsuUsers.map(t => t.osuUser.osuUserId)).to.eql(allUserIds);

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should add a team of two players to a game", function() {
    return new Promise(async (resolve, reject) => {
      try {
        // arrange
        const inTeams: string[][] = [["3336000", "3336001"]];
        const allUserIds = Helpers.flatten2Dto1D(inTeams);
        const createGameDto: CreateGameDto = {};
        const addTeamsDto: AddTeamsDto = {
          osuUsernamesOrIdsOrSeparators: TestHelpers.convertToTeamDtoArgFormat(inTeams)
        };
        const requestDto: DiscordRequestDto = {
          commType: "discord",
          authorId: "tester",
          originChannelId: "tester's amazing channel"
        };

        // act
        const gameController = iocContainer.get<GameController>(TYPES.GameController);
        const teamController = iocContainer.get<TeamController>(TYPES.TeamController);
        const createGameResponse = await gameController.create({ gameDto: createGameDto, requestDto: requestDto });
        expect(createGameResponse.success).to.be.true;
        const addTeamsResponse = await teamController.create({ teamDto: addTeamsDto, requestDto: requestDto });
        expect(addTeamsResponse.success).to.be.true;
        const addTeamsReport = addTeamsResponse.result;
        expect(addTeamsReport.teams).to.have.lengthOf(1);
        expect(addTeamsReport.teams[0].teamOsuUsernames).to.have.lengthOf(2);

        // assert state of database
        const teamRepository = getCustomRepository(TeamRepository);
        const [teamResults, totalTeams]: [Team[], number] = await teamRepository.findAndCount({
          relations: [
            "createdBy",
            "createdBy.discordUser",
            "teamOsuUsers",
            "teamOsuUsers.osuUser",
            "gameTeams",
            "gameTeams.addedBy",
            "gameTeams.addedBy.discordUser"
          ]
        });
        expect(totalTeams).to.equal(1);
        const team1 = teamResults[0];
        expect(team1.createdBy.discordUser.discordUserId).to.equal(requestDto.authorId);
        expect(team1.gameTeams).to.have.lengthOf(1);
        expect(team1.gameTeams[0].addedBy.discordUser.discordUserId).to.equal(requestDto.authorId);
        expect(team1.gameTeams[0].teamNumber).to.equal(1);
        expect(team1.teamOsuUsers).to.have.lengthOf(2);
        expect(team1.teamOsuUsers.map(t => t.osuUser.osuUserId)).to.eql(allUserIds);

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should add two teams of one player to a game", function() {
    return new Promise(async (resolve, reject) => {
      try {
        // arrange
        const inTeams: string[][] = [["3336000"], ["3336001"]];
        const allUserIds = Helpers.flatten2Dto1D(inTeams);
        const createGameDto: CreateGameDto = {};
        const addTeamsDto: AddTeamsDto = {
          osuUsernamesOrIdsOrSeparators: TestHelpers.convertToTeamDtoArgFormat(inTeams)
        };
        const requestDto: DiscordRequestDto = {
          commType: "discord",
          authorId: "tester",
          originChannelId: "tester's amazing channel"
        };

        // act
        const gameController = iocContainer.get<GameController>(TYPES.GameController);
        const teamController = iocContainer.get<TeamController>(TYPES.TeamController);
        const createGameResponse = await gameController.create({ gameDto: createGameDto, requestDto: requestDto });
        expect(createGameResponse.success).to.be.true;
        const addTeamsResponse = await teamController.create({ teamDto: addTeamsDto, requestDto: requestDto });
        expect(addTeamsResponse.success).to.be.true;
        const addTeamsReport = addTeamsResponse.result;
        expect(addTeamsReport.teams).to.have.lengthOf(2);
        expect(addTeamsReport.teams[0].teamOsuUsernames).to.have.lengthOf(1);
        expect(addTeamsReport.teams[1].teamOsuUsernames).to.have.lengthOf(1);

        // assert state of database
        const teamRepository = getCustomRepository(TeamRepository);
        const [teamResults, totalTeams]: [Team[], number] = await teamRepository.findAndCount({
          relations: [
            "createdBy",
            "createdBy.discordUser",
            "teamOsuUsers",
            "teamOsuUsers.osuUser",
            "gameTeams",
            "gameTeams.addedBy",
            "gameTeams.addedBy.discordUser"
          ]
        });
        expect(totalTeams).to.equal(2);
        const team1 = teamResults[0];
        expect(team1.createdBy.discordUser.discordUserId).to.equal(requestDto.authorId);
        expect(team1.gameTeams).to.have.lengthOf(1);
        expect(team1.gameTeams[0].addedBy.discordUser.discordUserId).to.equal(requestDto.authorId);
        expect(team1.gameTeams[0].teamNumber).to.equal(1);
        expect(team1.teamOsuUsers).to.have.lengthOf(1);
        expect(team1.teamOsuUsers.map(t => t.osuUser.osuUserId)).to.eql(inTeams[0]);
        const team2 = teamResults[1];
        expect(team2.createdBy.discordUser.discordUserId).to.equal(requestDto.authorId);
        expect(team2.gameTeams).to.have.lengthOf(1);
        expect(team2.gameTeams[0].addedBy.discordUser.discordUserId).to.equal(requestDto.authorId);
        expect(team2.gameTeams[0].teamNumber).to.equal(2);
        expect(team2.teamOsuUsers).to.have.lengthOf(1);
        expect(team2.teamOsuUsers.map(t => t.osuUser.osuUserId)).to.eql(inTeams[1]);

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should add two teams of two players to a game", function() {
    return new Promise(async (resolve, reject) => {
      try {
        // arrange
        const inTeams: string[][] = [["3336000", "3336001"], ["3336002", "3336003"]];
        const allUserIds = Helpers.flatten2Dto1D(inTeams);
        const createGameDto: CreateGameDto = {};
        const addTeamsDto: AddTeamsDto = {
          osuUsernamesOrIdsOrSeparators: TestHelpers.convertToTeamDtoArgFormat(inTeams)
        };
        const requestDto: DiscordRequestDto = {
          commType: "discord",
          authorId: "tester",
          originChannelId: "tester's amazing channel"
        };

        // act
        const gameController = iocContainer.get<GameController>(TYPES.GameController);
        const teamController = iocContainer.get<TeamController>(TYPES.TeamController);
        const createGameResponse = await gameController.create({ gameDto: createGameDto, requestDto: requestDto });
        expect(createGameResponse.success).to.be.true;
        const addTeamsResponse = await teamController.create({ teamDto: addTeamsDto, requestDto: requestDto });
        expect(addTeamsResponse.success).to.be.true;
        const addTeamsReport = addTeamsResponse.result;
        expect(addTeamsReport.teams).to.have.lengthOf(2);
        expect(addTeamsReport.teams[0].teamOsuUsernames).to.have.lengthOf(2);
        expect(addTeamsReport.teams[1].teamOsuUsernames).to.have.lengthOf(2);

        // assert state of database
        const teamRepository = getCustomRepository(TeamRepository);
        const [teamResults, totalTeams]: [Team[], number] = await teamRepository.findAndCount({
          relations: [
            "createdBy",
            "createdBy.discordUser",
            "teamOsuUsers",
            "teamOsuUsers.osuUser",
            "gameTeams",
            "gameTeams.addedBy",
            "gameTeams.addedBy.discordUser"
          ]
        });
        expect(totalTeams).to.equal(2);
        const team1 = teamResults[0];
        expect(team1.createdBy.discordUser.discordUserId).to.equal(requestDto.authorId);
        expect(team1.gameTeams).to.have.lengthOf(1);
        expect(team1.gameTeams[0].addedBy.discordUser.discordUserId).to.equal(requestDto.authorId);
        expect(team1.gameTeams[0].teamNumber).to.equal(1);
        expect(team1.teamOsuUsers).to.have.lengthOf(2);
        expect(team1.teamOsuUsers.map(t => t.osuUser.osuUserId)).to.eql(inTeams[0]);
        const team2 = teamResults[1];
        expect(team2.createdBy.discordUser.discordUserId).to.equal(requestDto.authorId);
        expect(team2.gameTeams).to.have.lengthOf(1);
        expect(team2.gameTeams[0].addedBy.discordUser.discordUserId).to.equal(requestDto.authorId);
        expect(team2.gameTeams[0].teamNumber).to.equal(2);
        expect(team2.teamOsuUsers).to.have.lengthOf(2);
        expect(team2.teamOsuUsers.map(t => t.osuUser.osuUserId)).to.eql(inTeams[1]);

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should add a team to the correct game", function() {
    return new Promise(async (resolve, reject) => {
      try {
        // create game DTO with startLives = some random big number
        // assert team.gameTeam.game.startingLives === the same random big number
        return reject();
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should add a team and ensure the team was created by the requesting user", function() {
    return new Promise(async (resolve, reject) => {
      try {
        // create multiple teams
        // team.createdBy.discordUser.discordUserId === requestingUserId
        // team.gameTeams[0].addedBy.discordUser.discordUserId === requestUserId
        return reject();
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
