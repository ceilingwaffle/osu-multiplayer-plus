import "../../../src/bootstrap";
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
import { UserController } from "../../../src/domain/user/user.controller";
import { UpdateGameReport } from "../../../src/domain/game/reports/update-game.report";
import { IDbClient } from "../../../src/database/db-client";

describe("When adding teams to a game", function() {
  this.beforeEach(function() {
    return new Promise(async (resolve, reject) => {
      try {
        const conn = await iocContainer.get<IDbClient>(TYPES.IDbClient).connect();
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

  it("should fail to add a team consisting of one new player and one previously-added", function() {
    return new Promise(async (resolve, reject) => {
      try {
        // arrange
        const teamGroups1: string[][] = [["3336000", "3336001"]];
        const teamGroups2: string[][] = [["3336000", "3336002"]];
        const createGameDto: CreateGameDto = {};
        const addTeamsDto1: AddTeamsDto = {
          osuUsernamesOrIdsOrSeparators: TestHelpers.convertToTeamDtoArgFormat(teamGroups1)
        };
        const addTeamsDto2: AddTeamsDto = {
          osuUsernamesOrIdsOrSeparators: TestHelpers.convertToTeamDtoArgFormat(teamGroups2)
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
        //  add team 1 (new player 1, new player 2)
        const addTeams1Response = await teamController.create({ teamDto: addTeamsDto1, requestDto: requestDto });
        expect(addTeams1Response.success).to.be.true;
        // fail to add team 2 (existing player 1, new player 3) - because player 1 is already in a team for this game
        const addTeams2Response = await teamController.create({ teamDto: addTeamsDto2, requestDto: requestDto });
        expect(addTeams2Response.success).to.be.false;

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should add a team then add another team", function() {
    return new Promise(async (resolve, reject) => {
      try {
        // arrange
        const teamGroups1: string[][] = [["alice", "bob"]];
        const teamGroups2: string[][] = [["Mark", "Tony"]];
        const createGameDto: CreateGameDto = {};
        const addTeamsDto1: AddTeamsDto = {
          osuUsernamesOrIdsOrSeparators: TestHelpers.convertToTeamDtoArgFormat(teamGroups1)
        };
        const addTeamsDto2: AddTeamsDto = {
          osuUsernamesOrIdsOrSeparators: TestHelpers.convertToTeamDtoArgFormat(teamGroups2)
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
        //  add team 1 (new player 1, new player 2)
        const addTeams1Response = await teamController.create({ teamDto: addTeamsDto1, requestDto: requestDto });
        expect(addTeams1Response.success).to.be.true;
        // add team 2 (new player 3, new player 4)
        const addTeams2Response = await teamController.create({ teamDto: addTeamsDto2, requestDto: requestDto });
        expect(addTeams2Response.success).to.be.true;

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
        expect(team1.teamOsuUsers.map(t => t.osuUser.osuUsername)).to.eql(teamGroups1[0]);
        const team2 = teamResults[1];
        expect(team2.createdBy.discordUser.discordUserId).to.equal(requestDto.authorId);
        expect(team2.gameTeams).to.have.lengthOf(1);
        expect(team2.gameTeams[0].addedBy.discordUser.discordUserId).to.equal(requestDto.authorId);
        expect(team2.gameTeams[0].teamNumber).to.equal(2);
        expect(team2.teamOsuUsers).to.have.lengthOf(2);
        expect(team2.teamOsuUsers.map(t => t.osuUser.osuUsername)).to.eql(teamGroups2[0]);

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should add a team to the game most recently created by the requesting user", function() {
    return new Promise(async (resolve, reject) => {
      try {
        // arrange
        const inTeams: string[][] = [["3336000", "3336001"]];
        const allUserIds = Helpers.flatten2Dto1D(inTeams);
        const createGame1Dto: CreateGameDto = { teamLives: 186 };
        const createGame2Dto: CreateGameDto = { teamLives: 581 };
        const addTeams1Dto: AddTeamsDto = {
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
        const createGame1Response = await gameController.create({ gameDto: createGame1Dto, requestDto: requestDto });
        expect(createGame1Response.success).to.be.true;
        const createGame2Response = await gameController.create({ gameDto: createGame2Dto, requestDto: requestDto });
        expect(createGame2Response.success).to.be.true;
        const addTeamsResponse = await teamController.create({ teamDto: addTeams1Dto, requestDto: requestDto });
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
            "gameTeams.game",
            "gameTeams.addedBy",
            "gameTeams.addedBy.discordUser"
          ]
        });
        expect(totalTeams).to.equal(1);
        const team1 = teamResults[0];
        expect(team1.createdBy.discordUser.discordUserId).to.equal(requestDto.authorId);
        expect(team1.gameTeams).to.have.lengthOf(1, "The team should only be added to one game.");
        expect(team1.gameTeams[0].game.teamLives).to.equal(
          createGame2Dto.teamLives,
          "The team was not added to the user's most-recently created game (game 2)."
        );

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should add the same team from game 1 to game 2 without creating a duplicate team", function() {
    return new Promise(async (resolve, reject) => {
      try {
        // arrange
        const teams: string[][] = [["3336000", "3336001"]];
        const game1BanchoIds = Helpers.flatten2Dto1D(teams);
        const createGame1Dto: CreateGameDto = {};
        const createGame2Dto: CreateGameDto = {};
        const addTeamsDto: AddTeamsDto = {
          osuUsernamesOrIdsOrSeparators: TestHelpers.convertToTeamDtoArgFormat(teams)
        };
        const requestDto: DiscordRequestDto = {
          commType: "discord",
          authorId: "tester",
          originChannelId: "tester's amazing channel"
        };

        // act
        const gameController = iocContainer.get<GameController>(TYPES.GameController);
        const teamController = iocContainer.get<TeamController>(TYPES.TeamController);
        // create game 1 and add team 1 to it
        const createGame1Response = await gameController.create({ gameDto: createGame1Dto, requestDto: requestDto });
        expect(createGame1Response.success).to.be.true;
        const addTeamsResponse1 = await teamController.create({ teamDto: addTeamsDto, requestDto: requestDto });
        expect(addTeamsResponse1.success).to.be.true;
        // get the id of the team just created
        const teamRepository = getCustomRepository(TeamRepository);
        const [teamResults, totalTeams]: [Team[], number] = await teamRepository.findAndCount({
          relations: ["gameTeams"]
        });
        expect(totalTeams).to.equal(1);
        const team1 = teamResults[0];
        expect(team1.gameTeams).to.have.lengthOf(1, "Team should be added to one game.");
        // create game 2 and add team 1 to it
        const createGame2Response = await gameController.create({ gameDto: createGame2Dto, requestDto: requestDto });
        expect(createGame2Response.success).to.be.true;
        const addTeamsResponse2 = await teamController.create({ teamDto: addTeamsDto, requestDto: requestDto });
        expect(addTeamsResponse2.success).to.be.true;
        // get the id of the team just created
        const [teamResultsAgain, totalTeamsAgain]: [Team[], number] = await teamRepository.findAndCount({
          relations: ["gameTeams"]
        });
        expect(totalTeamsAgain).to.equal(1);
        const team1Again = teamResultsAgain[0];
        expect(team1Again.gameTeams).to.have.lengthOf(2, "Team should be added to two games now.");
        expect(team1Again.id).to.equal(team1.id, "The same team should have been used.");

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should add a large team to a game (555 players)", function() {
    return new Promise(async (resolve, reject) => {
      try {
        // arrange
        const teams: string[][] = [[]];
        let startingUserId = 3336000;
        const teamPlayerCount = 555;
        for (let i = 0; i < teamPlayerCount; i++) {
          teams[0].push((startingUserId++).toString());
        }

        const createGame1Dto: CreateGameDto = {};
        const addTeamsDto: AddTeamsDto = {
          osuUsernamesOrIdsOrSeparators: TestHelpers.convertToTeamDtoArgFormat(teams)
        };
        const requestDto: DiscordRequestDto = {
          commType: "discord",
          authorId: "tester",
          originChannelId: "tester's amazing channel"
        };

        // act
        const gameController = iocContainer.get<GameController>(TYPES.GameController);
        const teamController = iocContainer.get<TeamController>(TYPES.TeamController);
        // create game 1 and add team 1 to it
        const createGame1Response = await gameController.create({ gameDto: createGame1Dto, requestDto: requestDto });
        expect(createGame1Response.success).to.be.true;
        const addTeamsResponse1 = await teamController.create({ teamDto: addTeamsDto, requestDto: requestDto });
        // assert that the request succeeded
        expect(addTeamsResponse1.success).to.be.true;

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should fail to complete a request containing a total player count higher than the maximum allowed", function() {
    return new Promise(async (resolve, reject) => {
      try {
        // arrange
        const teams: string[][] = [[]];
        let startingUserId = 3336000;
        const teamPlayerCount = 2000; // This value should be greater than the .env value "MAX_VARS_ALLOWED_IN_REQUEST"
        for (let i = 0; i < teamPlayerCount; i++) {
          teams[0].push((startingUserId++).toString());
        }

        const createGame1Dto: CreateGameDto = {};
        const addTeamsDto: AddTeamsDto = {
          osuUsernamesOrIdsOrSeparators: TestHelpers.convertToTeamDtoArgFormat(teams)
        };
        const requestDto: DiscordRequestDto = {
          commType: "discord",
          authorId: "tester",
          originChannelId: "tester's amazing channel"
        };

        // act
        const gameController = iocContainer.get<GameController>(TYPES.GameController);
        const teamController = iocContainer.get<TeamController>(TYPES.TeamController);
        const createGame1Response = await gameController.create({ gameDto: createGame1Dto, requestDto: requestDto });
        expect(createGame1Response.success).to.be.true;
        const addTeamsResponse1 = await teamController.create({ teamDto: addTeamsDto, requestDto: requestDto });
        expect(addTeamsResponse1.success).to.be.false;

        // assert
        expect(addTeamsResponse1.result).to.be.undefined;
        expect(addTeamsResponse1.message).lengthOf.to.be.greaterThan(0);
        expect(addTeamsResponse1.errors).to.be.not.null;
        expect(addTeamsResponse1.errors.messages).to.not.be.undefined;
        expect(addTeamsResponse1.errors.messages.join()).to.include("You are adding too many players at once");

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should add two teams of different sizes (2 and 3) to a game", function() {
    return new Promise(async (resolve, reject) => {
      try {
        // arrange
        const inTeams: string[][] = [["3336000", "3336001"], ["3336002", "3336003", "3336004"]];
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
        expect(addTeamsReport.teams[1].teamOsuUsernames).to.have.lengthOf(3);

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
        expect(team2.teamOsuUsers).to.have.lengthOf(3);
        expect(team2.teamOsuUsers.map(t => t.osuUser.osuUserId)).to.eql(inTeams[1]);

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should add some teams to a game and assign a unique team color to each team for that game", function() {
    return new Promise(async (resolve, reject) => {
      try {
        // arrange
        const inTeams: string[][] = [["3336000"], ["3336001"]];
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

        // assert state of database
        const teamRepository = getCustomRepository(TeamRepository);
        const [teamResults, totalTeams]: [Team[], number] = await teamRepository.findAndCount({
          relations: ["gameTeams"]
        });
        expect(totalTeams).to.equal(2);
        const team1 = teamResults[0];
        expect(team1.gameTeams).to.have.lengthOf(1);
        expect(team1.gameTeams[0].colorName).to.equal("red");
        expect(team1.gameTeams[0].colorValue).to.equal("#ff0000");
        const team2 = teamResults[1];
        expect(team2.gameTeams).to.have.lengthOf(1);
        expect(team2.gameTeams[0].colorName).to.equal("blue");
        expect(team2.gameTeams[0].colorValue).to.equal("#0000ff");

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should fail to add any teams if the requesting user has no target game", function() {
    // The target game is the game set using the !targetgame command, or if not set, then the user's most recent game created.
    return new Promise(async (resolve, reject) => {
      try {
        // arrange
        const inTeams: string[][] = [["3336000"]];
        const addTeamsDto: AddTeamsDto = {
          osuUsernamesOrIdsOrSeparators: TestHelpers.convertToTeamDtoArgFormat(inTeams)
        };
        const requestDto: DiscordRequestDto = {
          commType: "discord",
          authorId: "tester",
          originChannelId: "tester's amazing channel"
        };

        // act
        const teamController = iocContainer.get<TeamController>(TYPES.TeamController);
        const addTeamsResponse = await teamController.create({ teamDto: addTeamsDto, requestDto: requestDto });
        expect(addTeamsResponse.success).to.be.false;

        // assert state of database
        const teamRepository = getCustomRepository(TeamRepository);
        const [teamResults, totalTeams]: [Team[], number] = await teamRepository.findAndCount({ relations: [] });
        expect(totalTeams).to.equal(0);

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should fail to add a team if the requesting user has not created a game and has not targetted a game using the !targetgame command", function() {
    return new Promise(async (resolve, reject) => {
      try {
        // arrange
        const inTeams: string[][] = [["3336000"]];
        const createGameDto: CreateGameDto = {};
        const addTeamsDto: AddTeamsDto = {
          osuUsernamesOrIdsOrSeparators: TestHelpers.convertToTeamDtoArgFormat(inTeams)
        };
        const user1Request: DiscordRequestDto = {
          commType: "discord",
          authorId: "game_creator_user",
          originChannelId: "tester's amazing channel"
        };
        const user2Request: DiscordRequestDto = {
          commType: "discord",
          authorId: "unpermitted_user",
          originChannelId: "tester's amazing channel"
        };

        // act
        const gameController = iocContainer.get<GameController>(TYPES.GameController);
        const teamController = iocContainer.get<TeamController>(TYPES.TeamController);
        // User 1 (game creator) creates game 1
        const createGameResponse = await gameController.create({ gameDto: createGameDto, requestDto: user1Request });
        expect(createGameResponse.success).to.be.true;
        // User 2 (normal user) fails to add a team to game 1
        const addTeamsResponse = await teamController.create({ teamDto: addTeamsDto, requestDto: user2Request });
        expect(addTeamsResponse.success).to.be.false;
        expect(addTeamsResponse.result).to.be.undefined;
        // assert the error message received back
        expect(addTeamsResponse.message).lengthOf.to.be.greaterThan(0);
        expect(addTeamsResponse.errors).to.be.not.null;
        expect(addTeamsResponse.errors.messages).to.not.be.undefined;
        expect(addTeamsResponse.errors.messages.join()).to.include("No games have been created by");

        // assert state of database
        const teamRepository = getCustomRepository(TeamRepository);
        const [teamResults, totalTeams]: [Team[], number] = await teamRepository.findAndCount({ relations: [] });
        expect(totalTeams).to.equal(0);

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should fail to add a team if the requesting user has targeted a game they do not have permission for", function() {
    return new Promise(async (resolve, reject) => {
      try {
        // arrange
        const inTeams: string[][] = [["3336000"]];
        const createGameDto: CreateGameDto = {};
        const addTeamsDto: AddTeamsDto = {
          osuUsernamesOrIdsOrSeparators: TestHelpers.convertToTeamDtoArgFormat(inTeams)
        };
        const user1Request: DiscordRequestDto = {
          commType: "discord",
          authorId: "game_creator_user",
          originChannelId: "tester's amazing channel"
        };
        const user2Request: DiscordRequestDto = {
          commType: "discord",
          authorId: "unpermitted_user",
          originChannelId: "tester's amazing channel"
        };

        // act
        const gameController = iocContainer.get<GameController>(TYPES.GameController);
        const teamController = iocContainer.get<TeamController>(TYPES.TeamController);
        const userController = iocContainer.get<UserController>(TYPES.UserController);
        // User 1 (game creator) creates game 1
        const createGameResponse = await gameController.create({ gameDto: createGameDto, requestDto: user1Request });
        expect(createGameResponse.success).to.be.true;
        const createdGameReport: UpdateGameReport = createGameResponse.result;
        // User 2 targets game 1
        const updateGameTargetResponse = await userController.update({
          userDto: { targetGameId: createdGameReport.gameId },
          requestDto: user2Request
        });
        expect(updateGameTargetResponse.success).to.be.true;
        // User 2 (unpermitted user) fails to add a team to game 1
        const addTeamsResponse = await teamController.create({ teamDto: addTeamsDto, requestDto: user2Request });
        expect(addTeamsResponse.success).to.be.false;
        expect(addTeamsResponse.result).to.be.undefined;
        // assert the error message received back
        expect(addTeamsResponse.message).lengthOf.to.be.greaterThan(0);
        expect(addTeamsResponse.errors).to.be.not.null;
        expect(addTeamsResponse.errors.messages).to.not.be.undefined;
        expect(addTeamsResponse.errors.messages.join()).to.include("permit");

        // assert state of database
        const teamRepository = getCustomRepository(TeamRepository);
        const [teamResults, totalTeams]: [Team[], number] = await teamRepository.findAndCount({ relations: [] });
        expect(totalTeams).to.equal(0);

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should fail to add a team if a player on that team is already in a team for the game", function() {
    return new Promise(async (resolve, reject) => {
      try {
        // arrange
        const createGameDto: CreateGameDto = {};
        const user1Request: DiscordRequestDto = {
          commType: "discord",
          authorId: "game_creator_user",
          originChannelId: "tester's amazing channel"
        };
        const teamsInRequest1: string[][] = [["3336000", "3336001"]];
        const teamsInRequest2: string[][] = [["3336000", "3336002"]];
        const addTeam1Request: AddTeamsDto = {
          osuUsernamesOrIdsOrSeparators: TestHelpers.convertToTeamDtoArgFormat(teamsInRequest1)
        };
        const addTeam2Request: AddTeamsDto = {
          osuUsernamesOrIdsOrSeparators: TestHelpers.convertToTeamDtoArgFormat(teamsInRequest2)
        };

        // act
        const gameController = iocContainer.get<GameController>(TYPES.GameController);
        const teamController = iocContainer.get<TeamController>(TYPES.TeamController);
        // User 1 creates game 1
        const createGameResponse = await gameController.create({ gameDto: createGameDto, requestDto: user1Request });
        expect(createGameResponse.success).to.be.true;
        // User 1 adds team 1 (players 1 and 2)
        const addTeams1Response = await teamController.create({ teamDto: addTeam1Request, requestDto: user1Request });
        expect(addTeams1Response.success).to.be.true;
        // User 1 fails to add team 2 (players 1 and 3) because player 1 was already added to another team in the previous request
        const addTeams2Response = await teamController.create({ teamDto: addTeam2Request, requestDto: user1Request });
        expect(addTeams2Response.success).to.be.false;
        expect(addTeams2Response.result).to.be.undefined;
        // assert the error message received back
        expect(addTeams2Response.message).lengthOf.to.be.greaterThan(0);
        expect(addTeams2Response.errors).to.be.not.null;
        expect(addTeams2Response.errors.messages).to.not.be.undefined;
        expect(addTeams2Response.errors.messages.join()).to.include("fakeBanchoUsernameForBanchoUserId3336000");
        expect(addTeams2Response.errors.messages.join()).to.include("already been added");

        // assert state of database
        const teamRepository = getCustomRepository(TeamRepository);
        const [teamResults, totalTeams]: [Team[], number] = await teamRepository.findAndCount({ relations: [] });
        expect(totalTeams).to.equal(1, "Only the first team should have been added.");

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  it("should fail to add any teams if any player exists in more than one of the requested teams", function() {
    return new Promise(async (resolve, reject) => {
      try {
        // arrange
        // player 3336000 exists in 2 teams, so the request should be denied
        const teamsInRequest: string[][] = [["3336000", "3336001"], ["3336000", "3336002"]];
        const createGameDto: CreateGameDto = {};
        const addTeamsDto: AddTeamsDto = {
          osuUsernamesOrIdsOrSeparators: TestHelpers.convertToTeamDtoArgFormat(teamsInRequest)
        };
        const userRequest: DiscordRequestDto = {
          commType: "discord",
          authorId: "game_creator_user",
          originChannelId: "tester's amazing channel"
        };

        // act
        const gameController = iocContainer.get<GameController>(TYPES.GameController);
        const teamController = iocContainer.get<TeamController>(TYPES.TeamController);
        // User 1 creates game 1
        const createGameResponse = await gameController.create({ gameDto: createGameDto, requestDto: userRequest });
        expect(createGameResponse.success).to.be.true;
        // User 1 fails to add team 1 because player 3336000 exists in both teams 1 and 2
        const addTeamsResponse = await teamController.create({ teamDto: addTeamsDto, requestDto: userRequest });
        expect(addTeamsResponse.success).to.be.false;
        expect(addTeamsResponse.result).to.be.undefined;
        // assert the error message received back
        expect(addTeamsResponse.message).lengthOf.to.be.greaterThan(0);
        expect(addTeamsResponse.errors).to.be.not.null;
        expect(addTeamsResponse.errors.messages).to.not.be.undefined;
        expect(addTeamsResponse.errors.messages.join()).to.include("You tried adding this player to multiple teams: 3336000");

        // assert state of database
        const teamRepository = getCustomRepository(TeamRepository);
        const [teamResults, totalTeams]: [Team[], number] = await teamRepository.findAndCount({ relations: [] });
        expect(totalTeams).to.equal(0);

        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  xit("should fail to create any teams when attempting to add two identical teams", function() {
    return new Promise(async (resolve, reject) => {
      try {
        return reject();
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  xit("should allow a game ref to add a team", function() {
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

  xit("should fail to add a team to an ended game", function() {
    return new Promise(async (resolve, reject) => {
      try {
        return reject();
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  xit("should fail to add a team to a started game", function() {
    return new Promise(async (resolve, reject) => {
      try {
        return reject();
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });

  xit("should create 2 games and add team players to the most recetly created game", function() {
    return new Promise(async (resolve, reject) => {
      try {
        // assert db state
        // assert team report includes "Added to Game ID x"
        return reject();
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  });
});
