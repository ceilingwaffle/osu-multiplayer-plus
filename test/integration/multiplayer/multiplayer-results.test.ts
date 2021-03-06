import "../../../src/bootstrap";
import "mocha";
import * as chai from "chai";
import { expect } from "chai";
import * as spies from "chai-spies";
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
import { ReportableContextType } from "../../../src/multiplayer/reporting/reportable-context-type";
import { ReportableContext } from "../../../src/multiplayer/reporting/reportable-context";
import { ReportablesDeliverer } from "../../../src/multiplayer/classes/reportables-deliverer";
import { LeaderboardBuilder } from "../../../src/multiplayer/leaderboard/leaderboard-builder";
import { Leaderboard } from "../../../src/multiplayer/components/leaderboard";
import { expectedLeaderboards } from "./context/spreadsheet-leaderboards";
import { GameStatus } from "../../../src/domain/game/game-status";
import { TeamEliminatedGameEvent } from "../../../src/multiplayer/game-events/team-eliminated.game-event";
import { ApiMultiplayer } from "../../../src/osu/types/api-multiplayer";
import { TeamMode } from "../../../src/multiplayer/components/enums/team-mode";
import { FakeOsuApiFetcher } from "../../classes/fake-osu-api-fetcher";
import { MultiplayerResultsListener } from "../../../src/multiplayer/classes/multiplayer-results-listener";
import { IEventDispatcher } from "../../../src/events/interfaces/event-dispatcher";
import { EventHandler } from "../../../src/events/classes/event-handler";
import { IEvent } from "../../../src/events/interfaces/event";
import { MultiplayerResultsDeliverableEvent } from "../../../src/events/multiplayer-results-deliverable.event";
import { DiscordMultiplayerResultsDeliverableEventHandler } from "../../../src/events/handlers/discord-multiplayer-results-deliverable.event-handler";
import { DiscordLeaderboardImageBuilder } from "../../../src/multiplayer/leaderboard/discord-leaderboard-image-builder";
import { MatchService } from "../../../src/domain/match/match.service";
import { Match } from "../../../src/domain/match/match.entity";
import _ = require("lodash"); // do not convert to default import -- it will break!!

chai.use(chaiExclude);
chai.use(spies);

const matchService: MatchService = iocContainer.get<MatchService>(TYPES.MatchService);

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
            const matches: Match[] = await matchService.getMatchesOfGame(games1[0].id);
            const r1: VirtualMatch[] = processor1.buildBeatmapsGroupedByLobbyPlayedStatusesForGame(games1[0], matches);
            expect(r1.find(r => r.beatmapId === "BM1" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(1);
            expect(r1.find(r => r.beatmapId === "BM2" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(1);
            expect(r1.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(1);
            expect(r1.find(r => r.beatmapId === "BM4" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(1);
            expect(r1.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 2).matches).to.have.lengthOf(1);
            expect(r1)
              .excludingEvery(["matches", "id", "status", "gameLobbies", "createdAt", "updatedAt"])
              .to.deep.equal(processedState.lobby1ApiResults1);

            const processedData1: VirtualMatchReportData[] = await processor1.buildVirtualMatchReportGroupsForGame(games1[0], matches);

            const { allReportables, toBeReported } = MultiplayerResultsReporter.getItemsToBeReported({
              virtualMatchReportDatas: processedData1,
              game: games1[0],
              matches
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
            const matches: Match[] = await matchService.getMatchesOfGame(games2[0].id);
            const r2: VirtualMatch[] = processor2.buildBeatmapsGroupedByLobbyPlayedStatusesForGame(games2[0], matches);

            expect(r2.find(r => r.beatmapId === "BM1" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r2.find(r => r.beatmapId === "BM2" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r2.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(1);
            expect(r2.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 2).matches).to.have.lengthOf(1);
            expect(r2.find(r => r.beatmapId === "BM4" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r2.find(r => r.beatmapId === "BM5" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(1);
            expect(r2)
              .excludingEvery(["matches", "id", "status", "gameLobbies", "createdAt", "updatedAt"])
              .to.deep.equal(processedState.lobby2ApiResults1);

            const processedData2: VirtualMatchReportData[] = await processor2.buildVirtualMatchReportGroupsForGame(games2[0], matches);

            const { allReportables, toBeReported } = MultiplayerResultsReporter.getItemsToBeReported({
              virtualMatchReportDatas: processedData2,
              game: games2[0],
              matches
            });

            const leaderboardReportables = allReportables.filter(r => r.type === "leaderboard");
            const leaderboard_bm2_1 = leaderboardReportables[0].item as Leaderboard;
            const leaderboard_bm1_1 = leaderboardReportables[1].item as Leaderboard;
            const leaderboard_bm4_1 = leaderboardReportables[2].item as Leaderboard;

            // TODO: assert: players, beatmap, event type
            expect(leaderboard_bm2_1)
              .excludingEvery(["players", "beatmapPlayed", "eventIcon", "latestVirtualMatchTime", "leaderboardEventTime"])
              .to.deep.equal(expectedLeaderboards.bm2_1);

            expect(leaderboard_bm1_1)
              .excludingEvery(["players", "beatmapPlayed", "eventIcon", "latestVirtualMatchTime", "leaderboardEventTime"])
              .to.deep.equal(expectedLeaderboards.bm1_1);

            expect(leaderboard_bm4_1)
              .excludingEvery(["players", "beatmapPlayed", "eventIcon", "latestVirtualMatchTime", "leaderboardEventTime"])
              .to.deep.equal(expectedLeaderboards.bm4_1);

            // TODO: Assert leaderboardImageData
            const leaderboard_bm2_1_ImageData = DiscordLeaderboardImageBuilder.buildImageDataObjectFromLeaderboard(leaderboard_bm2_1);
            const leaderboard_bm2_1_ImageResult = await DiscordLeaderboardImageBuilder.build(leaderboard_bm2_1_ImageData);
            const leaderboard_bm1_1_ImageData = DiscordLeaderboardImageBuilder.buildImageDataObjectFromLeaderboard(leaderboard_bm1_1);
            const leaderboard_bm1_1_ImageResult = await DiscordLeaderboardImageBuilder.build(leaderboard_bm1_1_ImageData);
            const leaderboard_bm4_1_ImageData = DiscordLeaderboardImageBuilder.buildImageDataObjectFromLeaderboard(leaderboard_bm4_1);
            const leaderboard_bm4_1_ImageResult = await DiscordLeaderboardImageBuilder.build(leaderboard_bm4_1_ImageData);

            // console.log(pngBuffer);

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
            const matches: Match[] = await matchService.getMatchesOfGame(games3[0].id);
            const r3: VirtualMatch[] = processor3.buildBeatmapsGroupedByLobbyPlayedStatusesForGame(games3[0], matches);
            expect(r3.find(r => r.beatmapId === "BM1" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r3.find(r => r.beatmapId === "BM2" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r3.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r3.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 2).matches).to.have.lengthOf(2);
            expect(r3.find(r => r.beatmapId === "BM4" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r3.find(r => r.beatmapId === "BM5" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(1);
            expect(r3)
              .excludingEvery(["matches", "id", "status", "gameLobbies", "createdAt", "updatedAt"])
              .to.deep.equal(processedState.lobby2ApiResults2);

            const processedData3: VirtualMatchReportData[] = await processor3.buildVirtualMatchReportGroupsForGame(games3[0], matches);

            const { allReportables, toBeReported } = MultiplayerResultsReporter.getItemsToBeReported({
              virtualMatchReportDatas: processedData3,
              game: games3[0],
              matches
            });

            const leaderboardReportable = allReportables.filter(r => r.type === "leaderboard").slice(-1)[0];
            const leaderboard: Leaderboard = leaderboardReportable.item as Leaderboard;
            expect(leaderboard).to.not.be.undefined;
            // TODO: assert: players, beatmap, event type
            expect(leaderboard)
              .excludingEvery(["players", "beatmapPlayed", "eventIcon", "latestVirtualMatchTime"])
              .to.deep.equal(expectedLeaderboards.bm3_2);

            // TODO: Assert leaderboardImageData
            const leaderboardImageData = DiscordLeaderboardImageBuilder.buildImageDataObjectFromLeaderboard(leaderboard);
            const pngBuffer = await DiscordLeaderboardImageBuilder.build(leaderboardImageData);
            console.log(pngBuffer);

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
            const matches: Match[] = await matchService.getMatchesOfGame(games4[0].id);
            const r4: VirtualMatch[] = processor4.buildBeatmapsGroupedByLobbyPlayedStatusesForGame(games4[0], matches);
            expect(r4.find(r => r.beatmapId === "BM1" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r4.find(r => r.beatmapId === "BM2" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r4.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r4.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 2).matches).to.have.lengthOf(2);
            expect(r4.find(r => r.beatmapId === "BM4" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r4.find(r => r.beatmapId === "BM5" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r4)
              .excludingEvery(["matches", "id", "status", "gameLobbies", "createdAt", "updatedAt"])
              .to.deep.equal(processedState.lobby1ApiResults2);

            const processedData4: VirtualMatchReportData[] = await processor4.buildVirtualMatchReportGroupsForGame(games4[0], matches);

            const { allReportables, toBeReported } = MultiplayerResultsReporter.getItemsToBeReported({
              virtualMatchReportDatas: processedData4,
              game: games4[0],
              matches
            });

            const leaderboardReportable = allReportables.filter(r => r.type === "leaderboard").slice(-1)[0];
            const leaderboard: Leaderboard = leaderboardReportable.item as Leaderboard;
            expect(leaderboard).to.not.be.undefined;
            expect(leaderboard)
              .excludingEvery(["players", "beatmapPlayed", "eventIcon", "latestVirtualMatchTime"])
              .to.deep.equal(expectedLeaderboards.bm5_1);

            // TODO: Assert leaderboardImageData
            const leaderboardImageData = DiscordLeaderboardImageBuilder.buildImageDataObjectFromLeaderboard(leaderboard);
            const pngBuffer = await DiscordLeaderboardImageBuilder.build(leaderboardImageData);
            console.log(pngBuffer);

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
            const matches: Match[] = await matchService.getMatchesOfGame(games5[0].id);
            const r5: VirtualMatch[] = processor5.buildBeatmapsGroupedByLobbyPlayedStatusesForGame(games5[0], matches);
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

            const processedData5: VirtualMatchReportData[] = await processor5.buildVirtualMatchReportGroupsForGame(games5[0], matches);

            const { allReportables, toBeReported } = MultiplayerResultsReporter.getItemsToBeReported({
              virtualMatchReportDatas: processedData5,
              game: games5[0],
              matches
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
            const matches: Match[] = await matchService.getMatchesOfGame(games6[0].id);
            const r6: VirtualMatch[] = processor6.buildBeatmapsGroupedByLobbyPlayedStatusesForGame(games6[0], matches);
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

            const processedData6: VirtualMatchReportData[] = await processor6.buildVirtualMatchReportGroupsForGame(games6[0], matches);

            const { allReportables, toBeReported } = MultiplayerResultsReporter.getItemsToBeReported({
              virtualMatchReportDatas: processedData6,
              game: games6[0],
              matches
            });

            const leaderboardReportable = allReportables.filter(r => r.type === "leaderboard").slice(-1)[0];
            const leaderboard: Leaderboard = leaderboardReportable.item as Leaderboard;
            expect(leaderboard).to.not.be.undefined;
            // TODO: assert: players, beatmap, event type
            expect(leaderboard)
              .excludingEvery(["players", "beatmapPlayed", "eventIcon", "latestVirtualMatchTime"])
              .to.deep.equal(expectedLeaderboards.bm5_2);

            // TODO: Assert leaderboardImageData
            const leaderboardImageData = DiscordLeaderboardImageBuilder.buildImageDataObjectFromLeaderboard(leaderboard);
            const pngBuffer = await DiscordLeaderboardImageBuilder.build(leaderboardImageData);
            console.log(pngBuffer);

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
            const matches: Match[] = await matchService.getMatchesOfGame(games7[0].id);
            const r7: VirtualMatch[] = processor7.buildBeatmapsGroupedByLobbyPlayedStatusesForGame(games7[0], matches);
            expect(r7.find(r => r.beatmapId === "BM1" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r7.find(r => r.beatmapId === "BM2" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r7.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r7.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 2).matches).to.have.lengthOf(2);
            expect(r7.find(r => r.beatmapId === "BM4" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r7.find(r => r.beatmapId === "BM5" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(2);
            expect(r7.find(r => r.beatmapId === "BM5" && r.sameBeatmapNumber === 2).matches).to.have.lengthOf(2);
            expect(r7.find(r => r.beatmapId === "BM5" && r.sameBeatmapNumber === 3).matches).to.have.lengthOf(1);
            expect(r7)
              .excludingEvery(["matches", "id", "status", "gameLobbies", "createdAt", "updatedAt"])
              .to.deep.equal(processedState.lobby2ApiResults4);

            const processedData7: VirtualMatchReportData[] = await processor7.buildVirtualMatchReportGroupsForGame(games7[0], matches);

            const { allReportables, toBeReported } = MultiplayerResultsReporter.getItemsToBeReported({
              virtualMatchReportDatas: processedData7,
              game: games7[0],
              matches
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
            const matches: Match[] = await matchService.getMatchesOfGame(games8[0].id);
            const r8: VirtualMatch[] = processor8.buildBeatmapsGroupedByLobbyPlayedStatusesForGame(games8[0], matches);
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

            const processedData8: VirtualMatchReportData[] = await processor8.buildVirtualMatchReportGroupsForGame(games8[0], matches);

            const { allReportables, toBeReported } = MultiplayerResultsReporter.getItemsToBeReported({
              virtualMatchReportDatas: processedData8,
              game: games8[0],
              matches
            });

            const leaderboardReportable = allReportables.filter(r => r.type === "leaderboard").slice(-1)[0];
            const leaderboard: Leaderboard = leaderboardReportable.item as Leaderboard;
            expect(leaderboard).to.not.be.undefined;
            // TODO: assert: players, beatmap, event type
            expect(leaderboard)
              .excludingEvery(["players", "beatmapPlayed", "eventIcon", "latestVirtualMatchTime"])
              .to.deep.equal(expectedLeaderboards.bm5_3);

            // TODO: Assert leaderboardImageData
            const leaderboardImageData = DiscordLeaderboardImageBuilder.buildImageDataObjectFromLeaderboard(leaderboard);
            const pngBuffer = await DiscordLeaderboardImageBuilder.build(leaderboardImageData);
            console.log(pngBuffer);

            // team 2 should have been eliminated
            const eliminatedGameEventsInThisLeaderboardVirtualMatch = allReportables
              .filter(r => r.type === "game_event" && r.subType === "team_eliminated")
              .map(r => r.item as TeamEliminatedGameEvent)
              .filter(
                event =>
                  event.data.eventMatch.beatmapId === leaderboard.beatmapId &&
                  event.data.eventMatch.sameBeatmapNumber === leaderboard.sameBeatmapNumber
              );
            expect(eliminatedGameEventsInThisLeaderboardVirtualMatch).to.have.lengthOf(1);
            const eliminatedTeamId = eliminatedGameEventsInThisLeaderboardVirtualMatch.map(event => event.data.team.id)[0];
            expect(eliminatedTeamId).to.equal(2); // this assumes the team number is the same as the team ID

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

      describe("should process matches 1 to 8 one at a time", function() {
        it("lobby 1 map 1 (BM1#1) start", function() {
          return new Promise(async (resolve, reject) => {
            try {
              // setup
              const trimmedMpResults_L1_BM1_1_start = _(context.osuApiResults.lobby1ApiResults1).cloneDeep();
              trimmedMpResults_L1_BM1_1_start.matches.splice(1);
              trimmedMpResults_L1_BM1_1_start.matches[0].endTime = null;

              // process
              const processor = new MultiplayerResultsProcessor(trimmedMpResults_L1_BM1_1_start);
              const games: Game[] = await processor.saveMultiplayerEntities();
              expect(games).to.have.lengthOf(1);
              const game = games[0];
              const matches: Match[] = await matchService.getMatchesOfGame(game.id);
              const processedData: VirtualMatchReportData[] = await processor.buildVirtualMatchReportGroupsForGame(game, matches);
              const { allReportables, toBeReported } = MultiplayerResultsReporter.getItemsToBeReported({
                virtualMatchReportDatas: processedData,
                game: game,
                matches
              });

              // expect no reportables since no matches have completed yet
              expect(allReportables).to.have.lengthOf(0);
              expect(toBeReported).to.have.lengthOf(0);

              return resolve();
            } catch (error) {
              return reject(error);
            }
          });
        });

        it("lobby 1 map 1 (BM1#1) complete", function() {
          return new Promise(async (resolve, reject) => {
            try {
              // setup
              const trimmedMpResults = _(context.osuApiResults.lobby1ApiResults1).cloneDeep();
              trimmedMpResults.matches.splice(1);

              // process
              const processor = new MultiplayerResultsProcessor(trimmedMpResults);
              const games: Game[] = await processor.saveMultiplayerEntities();
              expect(games).to.have.lengthOf(1);
              const game = games[0];
              const matches: Match[] = await matchService.getMatchesOfGame(game.id);
              const processedData: VirtualMatchReportData[] = await processor.buildVirtualMatchReportGroupsForGame(game, matches);
              const { allReportables, toBeReported } = MultiplayerResultsReporter.getItemsToBeReported({
                virtualMatchReportDatas: processedData,
                game: game,
                matches
              });

              // expect reportables (no leaderboard yet because waiting on lobby 2 to complete BM1#1)
              expect(
                toBeReported.filter(r => r.subType === "lobby_awaiting" && r.beatmapId == "BM1" && r.sameBeatmapNumber == 1)
              ).to.have.lengthOf(1);
              expect(
                toBeReported.filter(r => r.subType === "lobby_completed" && r.beatmapId == "BM1" && r.sameBeatmapNumber == 1)
              ).to.have.lengthOf(1);
              // expect(
              //   toBeReported.filter(r => r.type === "leaderboard" && r.beatmapId == "BM1" && r.sameBeatmapNumber == 1)
              // ).to.have.lengthOf(1);

              return resolve();
            } catch (error) {
              return reject(error);
            }
          });
        });

        it("lobby 2 map 1 (BM2#1) start", function() {
          return new Promise(async (resolve, reject) => {
            try {
              // setup database state to include previous lobby results
              const trimmedMpResults_L1_BM1_1_start = _(context.osuApiResults.lobby1ApiResults1).cloneDeep();
              trimmedMpResults_L1_BM1_1_start.matches.splice(1);
              trimmedMpResults_L1_BM1_1_start.matches[0].endTime = null;
              new MultiplayerResultsProcessor(trimmedMpResults_L1_BM1_1_start).saveMultiplayerEntities();

              const trimmedMpResults_L1_BM1_1_end = _(context.osuApiResults.lobby1ApiResults1).cloneDeep();
              trimmedMpResults_L1_BM1_1_end.matches.splice(1);
              new MultiplayerResultsProcessor(trimmedMpResults_L1_BM1_1_end).saveMultiplayerEntities();

              // setup
              const trimmedMpResults_L2_BM2_1_start = _(context.osuApiResults.lobby2ApiResults1).cloneDeep();
              trimmedMpResults_L2_BM2_1_start.matches.splice(1);
              trimmedMpResults_L2_BM2_1_start.matches[0].endTime = null; // BM2#1

              // process
              const processor = new MultiplayerResultsProcessor(trimmedMpResults_L2_BM2_1_start);
              const games: Game[] = await processor.saveMultiplayerEntities();
              expect(games).to.have.lengthOf(1);
              const game = games[0];
              const matches: Match[] = await matchService.getMatchesOfGame(game.id);
              const processedData: VirtualMatchReportData[] = await processor.buildVirtualMatchReportGroupsForGame(game, matches);
              const { allReportables, toBeReported } = MultiplayerResultsReporter.getItemsToBeReported({
                virtualMatchReportDatas: processedData,
                game: game,
                matches
              });

              // expect reportables
              // expect reportables from lobby 1 BM1#1 to have already been reported (therefore, not in toBeReported)
              expect(
                toBeReported.filter(r => r.subType === "lobby_awaiting" && r.beatmapId == "BM1" && r.sameBeatmapNumber == 1)
              ).to.have.lengthOf(0);
              expect(
                toBeReported.filter(r => r.subType === "lobby_completed" && r.beatmapId == "BM1" && r.sameBeatmapNumber == 1)
              ).to.have.lengthOf(0);

              // expect no reportables from lobby #2 since no matches from lobby #2 have completed yet
              expect(
                toBeReported.filter(r => r.subType === "lobby_completed" && r.beatmapId == "BM2" && r.sameBeatmapNumber == 1)
              ).to.have.lengthOf(0);
              expect(
                toBeReported.filter(r => r.type === "leaderboard" && r.beatmapId == "BM2" && r.sameBeatmapNumber == 1)
              ).to.have.lengthOf(0);

              return resolve();
            } catch (error) {
              return reject(error);
            }
          });
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

  describe("aborted matches", function() {
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

    // TODO: Test aborted matches. See class: MultiplayerResultsListener, method: gatherReportableItemsForGame()

    it("should ensure a 'match aborted' message was reported", function() {
      return new Promise(async (resolve, reject) => {
        try {
          const lobby1ApiResults_AbortedMatch1: ApiMultiplayer = {
            multiplayerId: context.requests.addLobby1Request.banchoMultiplayerId,
            matches: [
              {
                mapNumber: 1,
                multiplayerId: context.requests.addLobby1Request.banchoMultiplayerId,
                mapId: "BM1",
                startTime: new Date().getTime() + 1000,
                endTime: null,
                teamMode: TeamMode.HeadToHead,
                event: "match_end",
                scores: [],
                aborted: true
              },
              {
                mapNumber: 2,
                multiplayerId: context.requests.addLobby1Request.banchoMultiplayerId,
                mapId: "BM2",
                startTime: new Date().getTime() + 11000,
                endTime: null,
                teamMode: TeamMode.HeadToHead,
                event: "match_start",
                scores: []
              }
            ]
          };

          let errorThrown: Error;
          const handler = new DiscordMultiplayerResultsDeliverableEventHandler();
          // replace the handle method with our own implementation
          let spy = chai.spy.on(handler, "handle", (event: MultiplayerResultsDeliverableEvent) => {
            try {
              const matchAbortedReportable = event.reportables.filter(r => r.subType === "match_aborted");
              expect(matchAbortedReportable).to.have.lengthOf(1);
              return true;
            } catch (error) {
              errorThrown = error;
              throw error;
            }
          });

          const dispatcher = iocContainer.get<IEventDispatcher>(TYPES.IEventDispatcher);
          dispatcher.subscribe(handler);

          const mpResultsListener = iocContainer.get<MultiplayerResultsListener>(TYPES.MultiplayerResultsListener);
          await mpResultsListener.eventEmitter.emit("newMultiplayerMatches", lobby1ApiResults_AbortedMatch1);

          setTimeout(function() {
            expect(spy).to.have.been.called();
            return errorThrown ? reject(errorThrown) : resolve();
          }, 5000); // need to wait some time here while the spied method is being called

          // TODO: Write unit test for NodesuApiTransformer isMatchAborted method
        } catch (error) {
          return reject(error);
        }
      });
    });

    xit("should ensure a 'match aborted' message was NOT reported", function() {});

    xit("should ensure no teams lost a life for the aborted match", function() {});
  });
});
