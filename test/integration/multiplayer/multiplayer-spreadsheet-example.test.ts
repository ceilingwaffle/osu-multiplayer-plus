import "../../../src/bootstrap";
import "mocha";
import * as chai from "chai";
import { expect } from "chai";
import iocContainer from "../../../src/inversify.config";
import TYPES from "../../../src/types";
import { IDbClient } from "../../../src/database/db-client";
import { MultiplayerResultsProcessor } from "../../../src/multiplayer/multiplayer-results-processor";
import { VirtualMatch } from "../../../src/multiplayer/virtual-match";
import { TestHelpers } from "../../test-helpers";
import { Lobby } from "../../../src/domain/lobby/lobby.entity";
import chaiExclude from "chai-exclude";
import { Match } from "../../../src/domain/match/match.entity";
import { GameController } from "../../../src/domain/game/game.controller";
import { LobbyController } from "../../../src/domain/lobby/lobby.controller";
import { Game } from "../../../src/domain/game/game.entity";
import { AddTeamsDto } from "../../../src/domain/team/dto/add-team.dto";
import { TeamController } from "../../../src/domain/team/team.controller";
import { GameRepository } from "../../../src/domain/game/game.repository";
import { getCustomRepository } from "typeorm";
import { LobbyBeatmapStatusMessageGroup } from "../../../src/multiplayer/lobby-beatmap-status-message";
import { context } from "./context/spreadsheet-context";
import { processedState } from "./context/spreadsheet-processed-state";

chai.use(chaiExclude);

describe("When processing multiplayer results", function() {
  this.beforeEach(function() {
    return new Promise(async (resolve, reject) => {
      try {
        await iocContainer.get<IDbClient>(TYPES.IDbClient).connect();
        // await TestHelpers.dropTestDatabase();

        // create game
        const gameController = iocContainer.get<GameController>(TYPES.GameController);
        const createdGameResponse = await gameController.create({
          gameDto: context.requests.createGameRequest1,
          requestDto: context.requests.discordRequest1
        });
        expect(createdGameResponse.success).to.be.true;

        // add lobby
        const lobbyController = iocContainer.get<LobbyController>(TYPES.LobbyController);
        const createdLobbyResponse = await lobbyController.create({
          lobbyDto: context.requests.addLobby1Request,
          requestDto: context.requests.discordRequest1
        });
        expect(createdLobbyResponse.success).to.be.true;

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

  describe("for the spreadsheet example", function() {
    it("should process the '1 game, 2 lobbies' spreadsheet example https://docs.google.com/spreadsheets/d/13GDEfc9s_XgSruD__ht4fQTC8U4D00IQrhxlASg52eA/edit?usp=sharing", function() {
      return new Promise(async (resolve, reject) => {
        try {
          const gameRepository: GameRepository = getCustomRepository(GameRepository);
          const teamController = iocContainer.get<TeamController>(TYPES.TeamController);
          const lobbyController = iocContainer.get<LobbyController>(TYPES.LobbyController);
          const gameController = iocContainer.get<GameController>(TYPES.GameController);

          const addTeamsDto: AddTeamsDto = {
            osuUsernamesOrIdsOrSeparators: TestHelpers.convertToTeamDtoArgFormat(context.values.teams._2v2)
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

          const reportedMatches: Match[] = await gameRepository.getReportedMatchesForGame(games7[0].id);
          const allGameLobbies: Lobby[] = games7[0].gameLobbies.map(gl => gl.lobby);
          const messages: LobbyBeatmapStatusMessageGroup = processor7.buildLobbyMatchReportMessages({
            virtualMatchesPlayed: blg7,
            reportedMatches,
            allGameLobbies
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

          return resolve();
        } catch (error) {
          return reject(error);
        }
      });
    });
  });
});
