import "../../../src/bootstrap";
import "mocha";
import * as chai from "chai";
import { expect } from "chai";
import chaiExclude from "chai-exclude";
import iocContainer from "../../../src/inversify.config";
import TYPES from "../../../src/types";
import { IDbClient } from "../../../src/database/db-client";
import { MultiplayerResultsProcessor } from "../../../src/multiplayer/classes/multiplayer-results-processor";
import { VirtualMatch } from "../../../src/multiplayer/virtual-match/virtual-match";
import { TestHelpers } from "../../test-helpers";
import { GameController } from "../../../src/domain/game/game.controller";
import { LobbyController } from "../../../src/domain/lobby/lobby.controller";
import { Game } from "../../../src/domain/game/game.entity";
import { AddTeamsDto } from "../../../src/domain/team/dto/add-team.dto";
import { TeamController } from "../../../src/domain/team/team.controller";
import { context } from "./context/spreadsheet-context";
import { processedState } from "./context/spreadsheet-processed-state";
import { VirtualMatchReportData } from "../../../src/multiplayer/virtual-match/virtual-match-report-data";
import { MultiplayerResultsReporter } from "../../../src/multiplayer/classes/multiplayer-results-reporter";
import { ReportableContext, ReportableContextType } from "../../../src/domain/game/game-match-reported.entity";
import { MultiplayerResultsDeliverer } from "../../../src/multiplayer/classes/multiplayer-results-deliverer";
import { LeaderboardBuilder } from "../../../src/multiplayer/leaderboard/leaderboard-builder";
import { Leaderboard } from "../../../src/multiplayer/components/leaderboard";
import { expectedLeaderboards } from "./context/spreadsheet-leaderboards";
import { GameStatus } from "../../../src/domain/game/game-status";

chai.use(chaiExclude);

describe("When processing multiplayer results", function() {
  describe("for the spreadsheet example - https://docs.google.com/spreadsheets/d/13GDEfc9s_XgSruD__ht4fQTC8U4D00IQrhxlASg52eA/edit?usp=sharing", function() {
    describe("for the '1 game, 2 lobbies' sheet (2v2)", function() {
      this.beforeAll(function() {
        return new Promise(async (resolve, reject) => {
          try {
            await iocContainer.get<IDbClient>(TYPES.IDbClient).connect();

            const teamController = iocContainer.get<TeamController>(TYPES.TeamController);
            const lobbyController = iocContainer.get<LobbyController>(TYPES.LobbyController);
            const gameController = iocContainer.get<GameController>(TYPES.GameController);

            // create game 1
            const createdGameResponse = await gameController.create({
              gameDto: context.requests.createGameRequest1,
              requestDto: context.requests.discordRequest1
            });
            expect(createdGameResponse.success).to.be.true;

            // add lobby 1
            const createdLobbyResponse = await lobbyController.create({
              lobbyDto: context.requests.addLobby1Request,
              requestDto: context.requests.discordRequest1
            });
            expect(createdLobbyResponse.success).to.be.true;

            // add 2v2v2v2 teams to game 1
            const addTeamsDto: AddTeamsDto = {
              osuUsernamesOrIdsOrSeparators: TestHelpers.convertToTeamDtoArgFormatFromObject(context.values.teams._2v2v2v2)
            };
            const addTeamsResponse = await teamController.create({ teamDto: addTeamsDto, requestDto: context.requests.discordRequest1 });
            expect(addTeamsResponse.success).to.be.true;

            // add lobby 2 to game 1
            const createdLobby2Response = await lobbyController.create({
              lobbyDto: context.requests.addLobby2Request,
              requestDto: context.requests.discordRequest1
            });
            expect(createdLobby2Response.success).to.be.true;

            // start game 1
            const startedGame1Response = await gameController.startGame({
              startGameDto: { gameId: 1 },
              requestDto: context.requests.discordRequest1
            });
            expect(startedGame1Response.success).to.be.true;

            return resolve();
          } catch (error) {
            return reject(error);
          }
        });
      });

      this.afterAll(function() {
        return new Promise(async (resolve, reject) => {
          try {
            const conn = iocContainer.get<IDbClient>(TYPES.IDbClient).getConnection();
            if (!conn) return reject("DB Connection ");
            await TestHelpers.dropTestDatabase(conn);
            conn.close();
            return resolve();
          } catch (error) {
            return reject(error);
          }
        });
      });

      it("should process lobby1ApiResults1", function() {
        return new Promise(async (resolve, reject) => {
          try {
            const processor1 = new MultiplayerResultsProcessor(context.osuApiResults.lobby1ApiResults1);
            const games1: Game[] = await processor1.saveMultiplayerEntities();
            expect(games1).to.have.lengthOf(1);
            const r1: VirtualMatch[] = processor1.buildBeatmapsGroupedByLobbyPlayedStatusesForGame(games1[0]);
            expect(r1.find(r => r.beatmapId === "BM1" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(1);
            expect(r1.find(r => r.beatmapId === "BM2" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(1);
            expect(r1.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(1);
            expect(r1.find(r => r.beatmapId === "BM4" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(1);
            expect(r1.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 2).matches).to.have.lengthOf(1);
            expect(r1)
              .excludingEvery(["matches", "id", "status", "gameLobbies", "createdAt", "updatedAt"])
              .to.deep.equal(processedState.lobby1ApiResults1);

            const processedData1: VirtualMatchReportData[] = await processor1.buildVirtualMatchReportGroupsForGame(games1[0]);

            const { allReportables, toBeReported } = MultiplayerResultsReporter.getItemsToBeReported({
              virtualMatchReportDatas: processedData1,
              game: games1[0]
            });

            const leaderboardReportable = allReportables.filter(r => r.type === "leaderboard").slice(-1)[0];
            // leaderboard should be undefined because lobby 2 has not submitted any results yet (therefore there are no completed virtual matches)
            expect(leaderboardReportable).to.be.undefined;

            // await MultiplayerResultsDeliverer.deliver({ reportables: toBeReported }); // leaderboard
            // TODO: Test the delivery in another test file. Just using it here for now to inspect the call stack.

            return resolve();
          } catch (error) {
            return reject(error);
          }
        });
      });

      it("should process lobby2ApiResults1", function() {
        return new Promise(async (resolve, reject) => {
          try {
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby1ApiResults1).saveMultiplayerEntities();

            const processor2 = new MultiplayerResultsProcessor(context.osuApiResults.lobby2ApiResults1);
            const games2: Game[] = await processor2.saveMultiplayerEntities();
            expect(games2).to.have.lengthOf(1);
            const r2 = processor2.buildBeatmapsGroupedByLobbyPlayedStatusesForGame(games2[0]);

            expect(r2.find(r => r.beatmapId === "BM1" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r2.find(r => r.beatmapId === "BM2" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r2.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(1);
            expect(r2.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 2).matches).to.have.lengthOf(1);
            expect(r2.find(r => r.beatmapId === "BM4" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r2.find(r => r.beatmapId === "BM5" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(1);
            expect(r2)
              .excludingEvery(["matches", "id", "status", "gameLobbies", "createdAt", "updatedAt"])
              .to.deep.equal(processedState.lobby2ApiResults1);

            const processedData2: VirtualMatchReportData[] = await processor2.buildVirtualMatchReportGroupsForGame(games2[0]);

            const { allReportables, toBeReported } = MultiplayerResultsReporter.getItemsToBeReported({
              virtualMatchReportDatas: processedData2,
              game: games2[0]
            });

            const leaderboardReportable = allReportables.filter(r => r.type === "leaderboard").slice(-1)[0];
            const leaderboard: Leaderboard = leaderboardReportable.item as Leaderboard;
            expect(leaderboard).to.not.be.undefined;
            // TODO: assert: players, beatmap, event type
            expect(leaderboard)
              .excludingEvery(["players", "beatmapPlayed", "eventIcon", "latestVirtualMatchTime"])
              .to.deep.equal(expectedLeaderboards.bm4_1);

            return resolve();
          } catch (error) {
            return reject(error);
          }
        });
      });

      it("should process lobby2ApiResults2", function() {
        return new Promise(async (resolve, reject) => {
          try {
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby1ApiResults1).saveMultiplayerEntities();
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby2ApiResults1).saveMultiplayerEntities();

            const processor3 = new MultiplayerResultsProcessor(context.osuApiResults.lobby2ApiResults2);
            const games3: Game[] = await processor3.saveMultiplayerEntities();
            expect(games3).to.have.lengthOf(1);
            const r3 = processor3.buildBeatmapsGroupedByLobbyPlayedStatusesForGame(games3[0]);
            expect(r3.find(r => r.beatmapId === "BM1" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r3.find(r => r.beatmapId === "BM2" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r3.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r3.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 2).matches).to.have.lengthOf(2);
            expect(r3.find(r => r.beatmapId === "BM4" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r3.find(r => r.beatmapId === "BM5" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(1);
            expect(r3)
              .excludingEvery(["matches", "id", "status", "gameLobbies", "createdAt", "updatedAt"])
              .to.deep.equal(processedState.lobby2ApiResults2);

            const processedData3: VirtualMatchReportData[] = await processor3.buildVirtualMatchReportGroupsForGame(games3[0]);

            const { allReportables, toBeReported } = MultiplayerResultsReporter.getItemsToBeReported({
              virtualMatchReportDatas: processedData3,
              game: games3[0]
            });

            const leaderboardReportable = allReportables.filter(r => r.type === "leaderboard").slice(-1)[0];
            const leaderboard: Leaderboard = leaderboardReportable.item as Leaderboard;
            expect(leaderboard).to.not.be.undefined;
            // TODO: assert: players, beatmap, event type
            expect(leaderboard)
              .excludingEvery(["players", "beatmapPlayed", "eventIcon", "latestVirtualMatchTime"])
              .to.deep.equal(expectedLeaderboards.bm3_2);

            return resolve();
          } catch (error) {
            return reject(error);
          }
        });
      });

      it("should process lobby1ApiResults2", function() {
        return new Promise(async (resolve, reject) => {
          try {
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby1ApiResults1).saveMultiplayerEntities();
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby2ApiResults1).saveMultiplayerEntities();
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby2ApiResults2).saveMultiplayerEntities();

            const processor4 = new MultiplayerResultsProcessor(context.osuApiResults.lobby1ApiResults2);
            const games4: Game[] = await processor4.saveMultiplayerEntities();
            expect(games4).to.have.lengthOf(1);
            const r4 = processor4.buildBeatmapsGroupedByLobbyPlayedStatusesForGame(games4[0]);
            expect(r4.find(r => r.beatmapId === "BM1" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r4.find(r => r.beatmapId === "BM2" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r4.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r4.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 2).matches).to.have.lengthOf(2);
            expect(r4.find(r => r.beatmapId === "BM4" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r4.find(r => r.beatmapId === "BM5" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r4)
              .excludingEvery(["matches", "id", "status", "gameLobbies", "createdAt", "updatedAt"])
              .to.deep.equal(processedState.lobby1ApiResults2);

            const processedData4: VirtualMatchReportData[] = await processor4.buildVirtualMatchReportGroupsForGame(games4[0]);

            const { allReportables, toBeReported } = MultiplayerResultsReporter.getItemsToBeReported({
              virtualMatchReportDatas: processedData4,
              game: games4[0]
            });

            const leaderboardReportable = allReportables.filter(r => r.type === "leaderboard").slice(-1)[0];
            const leaderboard: Leaderboard = leaderboardReportable.item as Leaderboard;
            expect(leaderboard).to.not.be.undefined;
            expect(leaderboard)
              .excludingEvery(["players", "beatmapPlayed", "eventIcon", "latestVirtualMatchTime"])
              .to.deep.equal(expectedLeaderboards.bm5_1);

            // await MultiplayerResultsDeliverer.deliver({ reportables: toBeReported }); // leaderboard

            return resolve();
          } catch (error) {
            return reject(error);
          }
        });
      });

      it("should process lobby2ApiResults3", function() {
        return new Promise(async (resolve, reject) => {
          try {
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby1ApiResults1).saveMultiplayerEntities();
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby2ApiResults1).saveMultiplayerEntities();
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby2ApiResults2).saveMultiplayerEntities();
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby1ApiResults2).saveMultiplayerEntities();

            const processor5 = new MultiplayerResultsProcessor(context.osuApiResults.lobby2ApiResults3);
            const games5: Game[] = await processor5.saveMultiplayerEntities();
            expect(games5).to.have.lengthOf(1);
            const r5 = processor5.buildBeatmapsGroupedByLobbyPlayedStatusesForGame(games5[0]);
            expect(r5.find(r => r.beatmapId === "BM1" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r5.find(r => r.beatmapId === "BM2" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r5.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r5.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 2).matches).to.have.lengthOf(2);
            expect(r5.find(r => r.beatmapId === "BM4" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r5.find(r => r.beatmapId === "BM5" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r5.find(r => r.beatmapId === "BM5" && r.sameBeatmapNumber === 2).matches).to.have.lengthOf(1);
            expect(r5)
              .excludingEvery(["matches", "id", "status", "gameLobbies", "createdAt", "updatedAt"])
              .to.deep.equal(processedState.lobby2ApiResults3);

            const processedData5: VirtualMatchReportData[] = await processor5.buildVirtualMatchReportGroupsForGame(games5[0]);

            const { allReportables, toBeReported } = MultiplayerResultsReporter.getItemsToBeReported({
              virtualMatchReportDatas: processedData5,
              game: games5[0]
            });

            // Since lobby2ApiResults3 only contains results for an incomplete virtual match (BM5#2), we should NOT have a leaderboard built for this VM
            const leaderboardReportable = allReportables
              .filter(r => r.type === "leaderboard" && r.beatmapId === "BM5" && r.sameBeatmapNumber === 2)
              .slice(-1)[0];
            expect(leaderboardReportable).to.be.undefined;

            return resolve();
          } catch (error) {
            return reject(error);
          }
        });
      });

      it("should process lobby1ApiResults3", function() {
        return new Promise(async (resolve, reject) => {
          try {
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby1ApiResults1).saveMultiplayerEntities();
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby2ApiResults1).saveMultiplayerEntities();
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby2ApiResults2).saveMultiplayerEntities();
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby1ApiResults2).saveMultiplayerEntities();
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby2ApiResults3).saveMultiplayerEntities();

            const processor6 = new MultiplayerResultsProcessor(context.osuApiResults.lobby1ApiResults3);
            const games6: Game[] = await processor6.saveMultiplayerEntities();
            expect(games6).to.have.lengthOf(1);
            const r6 = processor6.buildBeatmapsGroupedByLobbyPlayedStatusesForGame(games6[0]);
            expect(r6.find(r => r.beatmapId === "BM1" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r6.find(r => r.beatmapId === "BM2" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r6.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r6.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 2).matches).to.have.lengthOf(2);
            expect(r6.find(r => r.beatmapId === "BM4" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r6.find(r => r.beatmapId === "BM5" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r6.find(r => r.beatmapId === "BM5" && r.sameBeatmapNumber === 2).matches).to.have.lengthOf(2);
            expect(r6)
              .excludingEvery(["matches", "id", "status", "gameLobbies", "createdAt", "updatedAt"])
              .to.deep.equal(processedState.lobby1ApiResults3);

            const processedData6: VirtualMatchReportData[] = await processor6.buildVirtualMatchReportGroupsForGame(games6[0]);

            const { allReportables, toBeReported } = MultiplayerResultsReporter.getItemsToBeReported({
              virtualMatchReportDatas: processedData6,
              game: games6[0]
            });

            const leaderboardReportable = allReportables.filter(r => r.type === "leaderboard").slice(-1)[0];
            const leaderboard: Leaderboard = leaderboardReportable.item as Leaderboard;
            expect(leaderboard).to.not.be.undefined;
            // TODO: assert: players, beatmap, event type
            expect(leaderboard)
              .excludingEvery(["players", "beatmapPlayed", "eventIcon", "latestVirtualMatchTime"])
              .to.deep.equal(expectedLeaderboards.bm5_2);

            return resolve();
          } catch (error) {
            return reject(error);
          }
        });
      });

      it("should process lobby2ApiResults4", function() {
        return new Promise(async (resolve, reject) => {
          try {
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby1ApiResults1).saveMultiplayerEntities();
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby2ApiResults1).saveMultiplayerEntities();
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby2ApiResults2).saveMultiplayerEntities();
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby1ApiResults2).saveMultiplayerEntities();
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby2ApiResults3).saveMultiplayerEntities();
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby1ApiResults3).saveMultiplayerEntities();

            const processor7 = new MultiplayerResultsProcessor(context.osuApiResults.lobby2ApiResults4);
            const games7: Game[] = await processor7.saveMultiplayerEntities();
            expect(games7).to.have.lengthOf(1);
            const blg7 = processor7.buildBeatmapsGroupedByLobbyPlayedStatusesForGame(games7[0]);
            expect(blg7.find(r => r.beatmapId === "BM1" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(blg7.find(r => r.beatmapId === "BM2" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(blg7.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(blg7.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 2).matches).to.have.lengthOf(2);
            expect(blg7.find(r => r.beatmapId === "BM4" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(blg7.find(r => r.beatmapId === "BM5" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(blg7.find(r => r.beatmapId === "BM5" && r.sameBeatmapNumber === 2).matches).to.have.lengthOf(2);
            expect(blg7.find(r => r.beatmapId === "BM5" && r.sameBeatmapNumber === 3).matches).to.have.lengthOf(1);
            expect(blg7)
              .excludingEvery(["matches", "id", "status", "gameLobbies", "createdAt", "updatedAt"])
              .to.deep.equal(processedState.lobby2ApiResults4);

            const processedData7: VirtualMatchReportData[] = await processor7.buildVirtualMatchReportGroupsForGame(games7[0]);

            const { allReportables, toBeReported } = MultiplayerResultsReporter.getItemsToBeReported({
              virtualMatchReportDatas: processedData7,
              game: games7[0]
            });

            // Since lobby2ApiResults4 only contains results for an incomplete virtual match (BM5#3), we should NOT have a leaderboard built for this VM
            const leaderboardReportable = allReportables
              .filter(r => r.type === "leaderboard" && r.beatmapId === "BM5" && r.sameBeatmapNumber === 3)
              .slice(-1)[0];
            expect(leaderboardReportable).to.be.undefined;

            // two teams are still alive, so there should be no game champion yet
            const gameChampionEvents = toBeReported.filter(r => r.subType === "team_game_champion_declared");
            expect(gameChampionEvents).to.have.lengthOf(0);

            // assert that the game has NOT ended (since a winner has NOT been declared)
            const reloadedGame = await Game.findOne(games7[0].id);
            const gameisEnded = GameStatus.isEndedStatus(reloadedGame.status);
            expect(gameisEnded).to.be.false;

            return resolve();
          } catch (error) {
            return reject(error);
          }
        });
      });

      it("should process lobby1ApiResults4", function() {
        return new Promise(async (resolve, reject) => {
          try {
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby1ApiResults1).saveMultiplayerEntities();
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby2ApiResults1).saveMultiplayerEntities();
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby2ApiResults2).saveMultiplayerEntities();
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby1ApiResults2).saveMultiplayerEntities();
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby2ApiResults3).saveMultiplayerEntities();
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby1ApiResults3).saveMultiplayerEntities();
            await new MultiplayerResultsProcessor(context.osuApiResults.lobby2ApiResults4).saveMultiplayerEntities();

            const processor8 = new MultiplayerResultsProcessor(context.osuApiResults.lobby1ApiResults4);
            const games8: Game[] = await processor8.saveMultiplayerEntities();
            expect(games8).to.have.lengthOf(1);
            const r8 = processor8.buildBeatmapsGroupedByLobbyPlayedStatusesForGame(games8[0]);
            expect(r8.find(r => r.beatmapId === "BM1" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r8.find(r => r.beatmapId === "BM2" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r8.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r8.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 2).matches).to.have.lengthOf(2);
            expect(r8.find(r => r.beatmapId === "BM4" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r8.find(r => r.beatmapId === "BM5" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r8.find(r => r.beatmapId === "BM5" && r.sameBeatmapNumber === 2).matches).to.have.lengthOf(2);
            expect(r8.find(r => r.beatmapId === "BM5" && r.sameBeatmapNumber === 3).matches).to.have.lengthOf(2);
            expect(r8)
              .excludingEvery(["matches", "id", "status", "gameLobbies", "createdAt", "updatedAt"])
              .to.deep.equal(processedState.lobby1ApiResults4);

            const processedData8: VirtualMatchReportData[] = await processor8.buildVirtualMatchReportGroupsForGame(games8[0]);

            const { allReportables, toBeReported } = MultiplayerResultsReporter.getItemsToBeReported({
              virtualMatchReportDatas: processedData8,
              game: games8[0]
            });

            const leaderboardReportable = allReportables.filter(r => r.type === "leaderboard").slice(-1)[0];
            const leaderboard: Leaderboard = leaderboardReportable.item as Leaderboard;
            expect(leaderboard).to.not.be.undefined;
            // TODO: assert: players, beatmap, event type
            expect(leaderboard)
              .excludingEvery(["players", "beatmapPlayed", "eventIcon", "latestVirtualMatchTime"])
              .to.deep.equal(expectedLeaderboards.bm5_3);

            // only one team is alive, so there should be a game champion now
            const gameChampionEvents = toBeReported.filter(r => r.subType === "team_game_champion_declared");
            expect(gameChampionEvents).to.have.lengthOf(1);

            // assert that the game has ended (since a winner has now been declared)
            const reloadedGame = await Game.findOne(games8[0].id);
            const gameisEnded = GameStatus.isEndedStatus(reloadedGame.status);
            expect(gameisEnded).to.be.true;

            return resolve();
          } catch (error) {
            return reject(error);
          }
        });
      });
    });

    // TODO: Oct 14th
    //                ✅ Calculate game events for each VirtualMatch
    //                - Assert only building events for unreported matches (do this after each set of api results)
    //                - Assert correct winning team ID after each call to the processor
    //                - Save reported matches in DB (also include what message was reported e.g. awaiting some lobby / all lobbies completed)

    // TODO: assert actual messages object deep equals expected (and test correct beatmap number in message)
    //      test both completed and waiting messages

    // TODO: Test with some matches having null endTime

    // TODO: Test where lobby 1 BM#1 starts before lobby 2 BM#1, and lobby 2 BM#1 finishes before lobby 1 BM#1
    //       (e.g. if the results from lobby 1 had some network latency before submission)
  });
});
