import "../../../src/bootstrap";
import "mocha";
import * as chai from "chai";
import { assert, expect } from "chai";
import { MultiplayerResultsProcessor } from "../../../src/multiplayer/multiplayer-results-processor";
import { BeatmapLobbyPlayedStatusGroup } from "../../../src/multiplayer/beatmap-lobby-played-status-group";
import { ApiMultiplayer } from "../../../src/osu/types/api-multiplayer";
import { TeamMode } from "../../../src/multiplayer/components/enums/team-mode";
import { GameReport } from "../../../src/multiplayer/reports/game.report";
import { LeaderboardLine } from "../../../src/multiplayer/components/leaderboard-line";
import { TestHelpers } from "../../test-helpers";
import { Lobby as LobbyEntity, Lobby } from "../../../src/domain/lobby/lobby.entity";
import { LobbyStatus } from "../../../src/domain/lobby/lobby-status";
import { FakeOsuApiFetcher } from "../../classes/fake-osu-api-fetcher";
import chaiExclude from "chai-exclude";
import { DataPropertiesOnly } from "../../../src/utils/data-properties-only";
import { PlayMode } from "../../../src/multiplayer/components/enums/play-mode";
import { ScoringType } from "../../../src/multiplayer/components/enums/scoring-type";
import { Mods } from "../../../src/multiplayer/components/enums/mods";
import { Match as MatchEntity, Match } from "../../../src/domain/match/match.entity";
import { PlayerScore as PlayerScoreEntity } from "../../../src/domain/score/player-score.entity";
import { OsuUser as OsuUserEntity } from "../../../src/domain/user/osu-user.entity";
import { User as UserEntity } from "../../../src/domain/user/user.entity";
import { CreateGameDto } from "../../../src/domain/game/dto/create-game.dto";
import iocContainer from "../../../src/inversify.config";
import TYPES from "../../../src/types";
import { DiscordRequestDto } from "../../../src/requests/dto/discord-request.dto";
import { GameController } from "../../../src/domain/game/game.controller";
import { LobbyController } from "../../../src/domain/lobby/lobby.controller";
import { AddLobbyDto } from "../../../src/domain/lobby/dto/add-lobby.dto";
import { IDbClient } from "../../../src/database/db-client";
import { Game } from "../../../src/domain/game/game.entity";
import { Helpers } from "../../../src/utils/helpers";
import { AddTeamsDto } from "../../../src/domain/team/dto/add-team.dto";
import { TeamController } from "../../../src/domain/team/team.controller";
import { Game as GameEntity } from "../../../src/domain/game/game.entity";
import { GameStatus } from "../../../src/domain/game/game-status";
import { GameRepository } from "../../../src/domain/game/game.repository";
import { getCustomRepository } from "typeorm";
import {
  LobbyAwaitingBeatmapMessage,
  LobbyCompletedBeatmapMessage,
  AllLobbiesCompletedBeatmapMessage,
  LobbyBeatmapStatusMessageTypes
} from "../../../src/multiplayer/lobby-beatmap-status-message";
import _ = require("lodash"); // do not convert to default import or this will break

chai.use(chaiExclude);

// // arrange: ApiMultiplayer object
// // act: MultiplayerResultsService...
// // assert: MatchResults object

const discordRequest: DiscordRequestDto = {
  commType: "discord",
  authorId: "test_user",
  originChannelId: "test_channel_1"
};

const createGameRequest: CreateGameDto = {
  teamLives: 2,
  countFailedScores: "true"
};

const addLobby1Request: AddLobbyDto = {
  banchoMultiplayerId: "1234"
};
const addLobby2Request: AddLobbyDto = {
  banchoMultiplayerId: "5678"
};

describe("When processing multiplayer results", function() {
  this.beforeEach(function() {
    return new Promise(async (resolve, reject) => {
      try {
        const conn = await iocContainer.get<IDbClient>(TYPES.IDbClient).connect();
        // await TestHelpers.dropTestDatabase();

        // create game
        const gameController = iocContainer.get<GameController>(TYPES.GameController);
        const createdGameResponse = await gameController.create({ gameDto: createGameRequest, requestDto: discordRequest });
        expect(createdGameResponse.success).to.be.true;
        const createdGameReport = createdGameResponse.result;

        // add lobby
        const lobbyController = iocContainer.get<LobbyController>(TYPES.LobbyController);
        const createdLobbyResponse = await lobbyController.create({ lobbyDto: addLobby1Request, requestDto: discordRequest });
        expect(createdLobbyResponse.success).to.be.true;
        const createdLobbyReport = createdLobbyResponse.result;

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

  // describe("when no teams have been registered", function() {
  //   it("should not process any results"); // in the real world, a game will refuse to be started if no teams have been added, but we should check for this anyway to be safe
  // });

  xdescribe("with a number of results", function() {
    it("should process and save 1 API result containing 1 match result", function() {
      return new Promise(async (resolve, reject) => {
        try {
          // 2 teams
          // 1 player per team
          // (2 players total)
          // 1 API fetch
          // 1 match per API fetch
          // (1 match total)
          // all players submitting a score
          // (2 scores total)
          // all scores passing
          // match completed (not aborted)
          // MatchEvent = match_end

          // add teams
          const inTeams: string[][] = [["3336000"], ["3336001"]];
          const allUserIds = Helpers.flatten2Dto1D(inTeams);
          const addTeamsDto: AddTeamsDto = {
            osuUsernamesOrIdsOrSeparators: TestHelpers.convertToTeamDtoArgFormat(inTeams)
          };
          const teamController = iocContainer.get<TeamController>(TYPES.TeamController);
          const addTeamsResponse = await teamController.create({ teamDto: addTeamsDto, requestDto: discordRequest });
          expect(addTeamsResponse.success).to.be.true;

          // TODO: Get these omega objects from a json file instead
          const input: ApiMultiplayer = {
            multiplayerId: addLobby1Request.banchoMultiplayerId, // Lobby.banchoMultiplayerId
            matches: [
              {
                mapNumber: 1, // GameLobby.startingMapNumber
                multiplayerId: addLobby1Request.banchoMultiplayerId, // Lobby.banchoMultiplayerId
                mapId: "4178", // Match.beatmapId
                startTime: new Date().getTime() - 300, // Match.startTime
                endTime: new Date().getTime(), // Match.endTime
                teamMode: TeamMode.HeadToHead, // Match.teamMode
                event: "match_end",
                scores: [
                  {
                    osuUserId: "3336000", // Match.PlayerScores[].scoredBy(OsuUser).osuUserId
                    score: 100000, // Match.PlayerScores[].score
                    passed: true // Match.PlayerScores[].passed
                  },
                  {
                    osuUserId: "3336001",
                    score: 100001,
                    passed: true
                  }
                ]
              }
            ]
          };

          const expectedGamesData: DataPropertiesOnly<GameEntity[]> = [
            {
              id: 1,
              countFailedScores: createGameRequest.countFailedScores === "true",
              endedAt: null,
              status: GameStatus.IDLE_NEWGAME.getKey(),
              teamLives: createGameRequest.teamLives,
              gameLobbies: [
                {
                  startingMapNumber: 1,
                  removedAt: null,
                  lobby: {
                    id: 1,
                    banchoMultiplayerId: addLobby1Request.banchoMultiplayerId,
                    status: LobbyStatus.AWAITING_FIRST_SCAN.getKey(),
                    matches: [
                      {
                        id: 1,
                        mapNumber: 1,
                        beatmapId: "4178",
                        startTime: input.matches[0].startTime,
                        endTime: input.matches[0].endTime,
                        aborted: false,
                        ignored: false,
                        teamMode: TeamMode.HeadToHead,
                        playerScores: [
                          {
                            id: 1,
                            ignored: false,
                            passed: true,
                            score: 100000,
                            scoredBy: {
                              id: 1,
                              countryCode: "AU",
                              osuUserId: "3336000",
                              osuUsername: FakeOsuApiFetcher.getFakeBanchoUsername("3336000"),
                              user: {
                                id: 2
                              }
                            }
                          },
                          {
                            id: 2,
                            ignored: false,
                            passed: true,
                            score: 100001,
                            scoredBy: {
                              id: 2,
                              countryCode: "AU",
                              osuUserId: "3336001",
                              osuUsername: FakeOsuApiFetcher.getFakeBanchoUsername("3336001"),
                              user: {
                                id: 3
                              }
                            }
                          }
                        ]
                      }
                    ]
                  }
                }
              ],
              gameTeams: [
                {
                  colorName: "red",
                  colorValue: "#ff0000",
                  removedAt: null,
                  startingLives: createGameRequest.teamLives,
                  teamNumber: 1,
                  team: {
                    id: 1,
                    name: null,
                    teamOsuUsers: [
                      {
                        id: 1,
                        removedAt: null,
                        osuUser: {
                          id: 1,
                          countryCode: "AU",
                          osuUserId: "3336000",
                          osuUsername: FakeOsuApiFetcher.getFakeBanchoUsername("3336000")
                        }
                      }
                    ]
                  }
                },
                {
                  colorName: "blue",
                  colorValue: "#0000ff",
                  removedAt: null,
                  startingLives: createGameRequest.teamLives,
                  teamNumber: 2,
                  team: {
                    id: 2,
                    name: null,
                    teamOsuUsers: [
                      {
                        id: 2,
                        removedAt: null,
                        osuUser: {
                          id: 2,
                          countryCode: "AU",
                          osuUserId: "3336001",
                          osuUsername: FakeOsuApiFetcher.getFakeBanchoUsername("3336001")
                        }
                      }
                    ]
                  }
                }
              ],
              messageTargets: [
                {
                  authorId: discordRequest.authorId,
                  channelId: discordRequest.originChannelId,
                  channelType: "initial-channel",
                  commType: discordRequest.commType
                }
              ]
            }
          ];

          const processor = new MultiplayerResultsProcessor(input);
          const actualGames: Game[] = await processor.saveMultiplayerEntities();

          expect(actualGames).excludingEvery(["createdAt", "updatedAt"]).to.deep.equal(expectedGamesData); // prettier-ignore

          const expectedReports: GameReport[] = [
            {
              lobby: {
                banchoLobbyId: input.multiplayerId,
                lobbyName: null,
                resultsUrl: null
              },
              matches: [
                {
                  startTime: input.matches[0].startTime,
                  endTime: input.matches[0].endTime,
                  playMode: PlayMode.Standard,
                  scoringType: ScoringType.score,
                  teamType: TeamMode.HeadToHead,
                  forcedMods: Mods.None,
                  beatmap: { mapId: null, mapUrl: null, mapString: "" },
                  status: "completed"
                }
              ],
              leaderboardLines: [
                {
                  team: {
                    id: 1,
                    number: 1,
                    colorName: "",
                    colorValue: "",
                    position: 2,
                    members: [
                      {
                        osuUserId: "3336000",
                        osuUsername: FakeOsuApiFetcher.getFakeBanchoUsername("3336000"),
                        countryCode: "AU",
                        countryEmoji: "🇦🇺"
                      }
                    ]
                  },
                  teamStatus: {
                    isEliminated: false,
                    justEliminated: false,
                    lives: createGameRequest.teamLives - 1 // team 1 scored lower than team 2, so they lose a life
                  },
                  teamScore: {
                    teamScore: 100000,
                    playerScores: [
                      {
                        osuUserId: "3336000",
                        passed: true,
                        score: 100000,
                        mods: null
                      }
                    ]
                  }
                },
                {
                  team: {
                    id: 2,
                    number: 2,
                    colorName: "",
                    colorValue: "",
                    position: 1,
                    members: [
                      {
                        osuUserId: "3336001",
                        osuUsername: FakeOsuApiFetcher.getFakeBanchoUsername("3336001"),
                        countryCode: "AU",
                        countryEmoji: "🇦🇺"
                      }
                    ]
                  },
                  teamStatus: {
                    isEliminated: false,
                    justEliminated: false,
                    lives: createGameRequest.teamLives
                  },
                  teamScore: {
                    teamScore: 100001,
                    playerScores: [
                      {
                        osuUserId: "3336001",
                        passed: true,
                        score: 100001,
                        mods: null
                      }
                    ]
                  }
                }
              ]
            }
          ];

          // const actualReports: GameReport[] = await processor.buildGameReports(actualGames);
          // expect(actualReports).to.deep.equal(expectedReports);

          return resolve();
        } catch (error) {
          return reject(error);
        }
      });
    });

    it("should process the same API result twice without saving duplicates", function() {
      return new Promise(async (resolve, reject) => {
        try {
          // all twice:
          //   2 teams
          //   1 player per team
          //   (2 players total)
          //   1 API fetch
          //   1 match per API fetch
          //   (1 match total)
          //   all players submitting a score
          //   (2 scores total)
          //   all scores passing
          //   match completed (not aborted)
          //   MatchEvent = match_end

          // add teams
          const inTeams: string[][] = [["3336000"], ["3336001"]];
          const allUserIds = Helpers.flatten2Dto1D(inTeams);
          const addTeamsDto: AddTeamsDto = {
            osuUsernamesOrIdsOrSeparators: TestHelpers.convertToTeamDtoArgFormat(inTeams)
          };
          const teamController = iocContainer.get<TeamController>(TYPES.TeamController);
          const addTeamsResponse = await teamController.create({ teamDto: addTeamsDto, requestDto: discordRequest });
          expect(addTeamsResponse.success).to.be.true;

          const input: ApiMultiplayer = {
            multiplayerId: addLobby1Request.banchoMultiplayerId, // Lobby.banchoMultiplayerId
            matches: [
              {
                mapNumber: 1, // GameLobby.startingMapNumber
                multiplayerId: addLobby1Request.banchoMultiplayerId, // Lobby.banchoMultiplayerId
                mapId: "4178", // Match.beatmapId
                startTime: new Date().getTime() - 300, // Match.startTime
                endTime: new Date().getTime(), // Match.endTime
                teamMode: TeamMode.HeadToHead, // Match.teamMode
                event: "match_end",
                scores: [
                  {
                    osuUserId: "3336000", // Match.PlayerScores[].scoredBy(OsuUser).osuUserId
                    score: 100000, // Match.PlayerScores[].score
                    passed: true // Match.PlayerScores[].passed
                  },
                  {
                    osuUserId: "3336001",
                    score: 100001,
                    passed: true
                  }
                ]
              }
            ]
          };

          const expectedGamesData: DataPropertiesOnly<GameEntity[]> = [
            {
              id: 1,
              countFailedScores: createGameRequest.countFailedScores === "true",
              endedAt: null,
              status: GameStatus.IDLE_NEWGAME.getKey(),
              teamLives: createGameRequest.teamLives,
              gameLobbies: [
                {
                  startingMapNumber: 1,
                  removedAt: null,
                  lobby: {
                    id: 1,
                    banchoMultiplayerId: addLobby1Request.banchoMultiplayerId,
                    status: LobbyStatus.AWAITING_FIRST_SCAN.getKey(),
                    matches: [
                      {
                        id: 1,
                        mapNumber: 1,
                        beatmapId: "4178",
                        startTime: input.matches[0].startTime,
                        endTime: input.matches[0].endTime,
                        aborted: false,
                        ignored: false,
                        teamMode: TeamMode.HeadToHead,
                        playerScores: [
                          {
                            id: 1,
                            ignored: false,
                            passed: true,
                            score: 100000,
                            scoredBy: {
                              id: 1,
                              countryCode: "AU",
                              osuUserId: "3336000",
                              osuUsername: FakeOsuApiFetcher.getFakeBanchoUsername("3336000"),
                              user: {
                                id: 2
                              }
                            }
                          },
                          {
                            id: 2,
                            ignored: false,
                            passed: true,
                            score: 100001,
                            scoredBy: {
                              id: 2,
                              countryCode: "AU",
                              osuUserId: "3336001",
                              osuUsername: FakeOsuApiFetcher.getFakeBanchoUsername("3336001"),
                              user: {
                                id: 3
                              }
                            }
                          }
                        ]
                      }
                    ]
                  }
                }
              ],
              gameTeams: [
                {
                  colorName: "red",
                  colorValue: "#ff0000",
                  removedAt: null,
                  startingLives: createGameRequest.teamLives,
                  teamNumber: 1,
                  team: {
                    id: 1,
                    name: null,
                    teamOsuUsers: [
                      {
                        id: 1,
                        removedAt: null,
                        osuUser: {
                          id: 1,
                          countryCode: "AU",
                          osuUserId: "3336000",
                          osuUsername: FakeOsuApiFetcher.getFakeBanchoUsername("3336000")
                        }
                      }
                    ]
                  }
                },
                {
                  colorName: "blue",
                  colorValue: "#0000ff",
                  removedAt: null,
                  startingLives: createGameRequest.teamLives,
                  teamNumber: 2,
                  team: {
                    id: 2,
                    name: null,
                    teamOsuUsers: [
                      {
                        id: 2,
                        removedAt: null,
                        osuUser: {
                          id: 2,
                          countryCode: "AU",
                          osuUserId: "3336001",
                          osuUsername: FakeOsuApiFetcher.getFakeBanchoUsername("3336001")
                        }
                      }
                    ]
                  }
                }
              ],
              messageTargets: [
                {
                  authorId: discordRequest.authorId,
                  channelId: discordRequest.originChannelId,
                  channelType: "initial-channel",
                  commType: discordRequest.commType
                }
              ]
            }
          ];

          // process the same API result twice
          const processor1 = new MultiplayerResultsProcessor(input);
          const actualGames1: Game[] = await processor1.saveMultiplayerEntities();

          expect(actualGames1).excludingEvery(["createdAt", "updatedAt"]).to.deep.equal(expectedGamesData); // prettier-ignore

          const processor2 = new MultiplayerResultsProcessor(input);
          const actualGames2 = await processor2.saveMultiplayerEntities();
          expect(actualGames2).excludingEvery(["createdAt", "updatedAt"]).to.deep.equal(expectedGamesData); // prettier-ignore

          // ensure database records were only inserted once
          expect(await LobbyEntity.count()).to.equal(1);
          expect(await MatchEntity.count()).to.equal(1);
          expect(await PlayerScoreEntity.count()).to.equal(2);
          expect(await UserEntity.count()).to.equal(3);
          expect(await OsuUserEntity.count()).to.equal(2);

          return resolve();
        } catch (error) {
          return reject(error);
        }
      });
    });

    it("should process and save 2 API results containing 1 match result each", function() {
      return new Promise(async (resolve, reject) => {
        try {
          // 2 teams
          // 1 player per team
          // (2 players total)
          // 2 API fetches
          // 1 match per API fetch
          // (2 matches total)
          // all players submitting a score
          // (4 scores total)
          // all scores passing
          // match completed (not aborted)
          // MatchEvent = match_end

          // add teams
          const inTeams: string[][] = [["3336000"], ["3336001"]];
          const allUserIds = Helpers.flatten2Dto1D(inTeams);
          const addTeamsDto: AddTeamsDto = {
            osuUsernamesOrIdsOrSeparators: TestHelpers.convertToTeamDtoArgFormat(inTeams)
          };
          const teamController = iocContainer.get<TeamController>(TYPES.TeamController);
          const addTeamsResponse = await teamController.create({ teamDto: addTeamsDto, requestDto: discordRequest });
          expect(addTeamsResponse.success).to.be.true;

          const apiResults1: ApiMultiplayer = {
            multiplayerId: addLobby1Request.banchoMultiplayerId, // Lobby.banchoMultiplayerId
            matches: [
              {
                mapNumber: 1, // GameLobby.startingMapNumber
                multiplayerId: addLobby1Request.banchoMultiplayerId, // Lobby.banchoMultiplayerId
                mapId: "4178", // Match.beatmapId
                startTime: new Date().getTime() - 300, // Match.startTime
                endTime: new Date().getTime(), // Match.endTime
                teamMode: TeamMode.HeadToHead, // Match.teamMode
                event: "match_end",
                scores: [
                  {
                    osuUserId: "3336000", // Match.PlayerScores[].scoredBy(OsuUser).osuUserId
                    score: 100000, // Match.PlayerScores[].score
                    passed: true // Match.PlayerScores[].passed
                  },
                  {
                    osuUserId: "3336001",
                    score: 100001,
                    passed: true
                  }
                ]
              }
            ]
          };

          const expectedGamesData1: DataPropertiesOnly<GameEntity[]> = [
            {
              id: 1,
              countFailedScores: createGameRequest.countFailedScores === "true",
              endedAt: null,
              status: GameStatus.IDLE_NEWGAME.getKey(),
              teamLives: createGameRequest.teamLives,
              gameLobbies: [
                {
                  startingMapNumber: 1,
                  removedAt: null,
                  lobby: {
                    id: 1,
                    banchoMultiplayerId: addLobby1Request.banchoMultiplayerId,
                    status: LobbyStatus.AWAITING_FIRST_SCAN.getKey(),
                    matches: [
                      {
                        id: 1,
                        mapNumber: 1,
                        beatmapId: "4178",
                        startTime: apiResults1.matches[0].startTime,
                        endTime: apiResults1.matches[0].endTime,
                        aborted: false,
                        ignored: false,
                        teamMode: TeamMode.HeadToHead,
                        playerScores: [
                          {
                            id: 1,
                            ignored: false,
                            passed: true,
                            score: 100000,
                            scoredBy: {
                              id: 1,
                              countryCode: "AU",
                              osuUserId: "3336000",
                              osuUsername: FakeOsuApiFetcher.getFakeBanchoUsername("3336000"),
                              user: {
                                id: 2
                              }
                            }
                          },
                          {
                            id: 2,
                            ignored: false,
                            passed: true,
                            score: 100001,
                            scoredBy: {
                              id: 2,
                              countryCode: "AU",
                              osuUserId: "3336001",
                              osuUsername: FakeOsuApiFetcher.getFakeBanchoUsername("3336001"),
                              user: {
                                id: 3
                              }
                            }
                          }
                        ]
                      }
                    ]
                  }
                }
              ],
              gameTeams: [
                {
                  colorName: "red",
                  colorValue: "#ff0000",
                  removedAt: null,
                  startingLives: createGameRequest.teamLives,
                  teamNumber: 1,
                  team: {
                    id: 1,
                    name: null,
                    teamOsuUsers: [
                      {
                        id: 1,
                        removedAt: null,
                        osuUser: {
                          id: 1,
                          countryCode: "AU",
                          osuUserId: "3336000",
                          osuUsername: FakeOsuApiFetcher.getFakeBanchoUsername("3336000")
                        }
                      }
                    ]
                  }
                },
                {
                  colorName: "blue",
                  colorValue: "#0000ff",
                  removedAt: null,
                  startingLives: createGameRequest.teamLives,
                  teamNumber: 2,
                  team: {
                    id: 2,
                    name: null,
                    teamOsuUsers: [
                      {
                        id: 2,
                        removedAt: null,
                        osuUser: {
                          id: 2,
                          countryCode: "AU",
                          osuUserId: "3336001",
                          osuUsername: FakeOsuApiFetcher.getFakeBanchoUsername("3336001")
                        }
                      }
                    ]
                  }
                }
              ],
              messageTargets: [
                {
                  authorId: discordRequest.authorId,
                  channelId: discordRequest.originChannelId,
                  channelType: "initial-channel",
                  commType: discordRequest.commType
                }
              ]
            }
          ];

          const processor = new MultiplayerResultsProcessor(apiResults1);
          const actualGames1 = await processor.saveMultiplayerEntities();

          expect(actualGames1).excludingEvery(["createdAt", "updatedAt"]).to.deep.equal(expectedGamesData1); // prettier-ignore

          const apiResults2: ApiMultiplayer = {
            multiplayerId: addLobby1Request.banchoMultiplayerId, // Lobby.banchoMultiplayerId
            matches: [
              {
                mapNumber: 2, // GameLobby.startingMapNumber
                multiplayerId: addLobby1Request.banchoMultiplayerId, // Lobby.banchoMultiplayerId
                mapId: "6666", // Match.beatmapId
                startTime: new Date().getTime() - 300, // Match.startTime
                endTime: new Date().getTime(), // Match.endTime
                teamMode: TeamMode.HeadToHead, // Match.teamMode
                event: "match_end",
                scores: [
                  {
                    osuUserId: "3336000", // Match.PlayerScores[].scoredBy(OsuUser).osuUserId
                    score: 200000, // Match.PlayerScores[].score
                    passed: true // Match.PlayerScores[].passed
                  },
                  {
                    osuUserId: "3336001",
                    score: 200001,
                    passed: true
                  }
                ]
              }
            ]
          };

          const expectedGamesData2: DataPropertiesOnly<GameEntity[]> = [
            {
              id: 1,
              countFailedScores: createGameRequest.countFailedScores === "true",
              endedAt: null,
              status: GameStatus.IDLE_NEWGAME.getKey(),
              teamLives: createGameRequest.teamLives,
              gameLobbies: [
                {
                  startingMapNumber: 1,
                  removedAt: null,
                  lobby: {
                    id: 1,
                    banchoMultiplayerId: addLobby1Request.banchoMultiplayerId,
                    status: LobbyStatus.AWAITING_FIRST_SCAN.getKey(),
                    matches: [
                      expectedGamesData1[0].gameLobbies[0].lobby.matches[0],
                      {
                        id: 2,
                        mapNumber: 2,
                        beatmapId: "6666",
                        startTime: apiResults2.matches[0].startTime,
                        endTime: apiResults2.matches[0].endTime,
                        aborted: false,
                        ignored: false,
                        teamMode: TeamMode.HeadToHead,
                        playerScores: [
                          {
                            id: 3,
                            ignored: false,
                            passed: true,
                            score: 200000,
                            scoredBy: {
                              id: 1,
                              countryCode: "AU",
                              osuUserId: "3336000",
                              osuUsername: FakeOsuApiFetcher.getFakeBanchoUsername("3336000"),
                              user: {
                                id: 2
                              }
                            }
                          },
                          {
                            id: 4,
                            ignored: false,
                            passed: true,
                            score: 200001,
                            scoredBy: {
                              id: 2,
                              countryCode: "AU",
                              osuUserId: "3336001",
                              osuUsername: FakeOsuApiFetcher.getFakeBanchoUsername("3336001"),
                              user: {
                                id: 3
                              }
                            }
                          }
                        ]
                      }
                    ]
                  }
                }
              ],
              gameTeams: [
                {
                  colorName: "red",
                  colorValue: "#ff0000",
                  removedAt: null,
                  startingLives: createGameRequest.teamLives,
                  teamNumber: 1,
                  team: {
                    id: 1,
                    name: null,
                    teamOsuUsers: [
                      {
                        id: 1,
                        removedAt: null,
                        osuUser: {
                          id: 1,
                          countryCode: "AU",
                          osuUserId: "3336000",
                          osuUsername: FakeOsuApiFetcher.getFakeBanchoUsername("3336000")
                        }
                      }
                    ]
                  }
                },
                {
                  colorName: "blue",
                  colorValue: "#0000ff",
                  removedAt: null,
                  startingLives: createGameRequest.teamLives,
                  teamNumber: 2,
                  team: {
                    id: 2,
                    name: null,
                    teamOsuUsers: [
                      {
                        id: 2,
                        removedAt: null,
                        osuUser: {
                          id: 2,
                          countryCode: "AU",
                          osuUserId: "3336001",
                          osuUsername: FakeOsuApiFetcher.getFakeBanchoUsername("3336001")
                        }
                      }
                    ]
                  }
                }
              ],
              messageTargets: [
                {
                  authorId: discordRequest.authorId,
                  channelId: discordRequest.originChannelId,
                  channelType: "initial-channel",
                  commType: discordRequest.commType
                }
              ]
            }
          ];

          const processor2 = new MultiplayerResultsProcessor(apiResults2);
          const actualGamesData2: Game[] = await processor2.saveMultiplayerEntities();

          expect(actualGamesData2).excludingEvery(["createdAt", "updatedAt"]).to.deep.equal(expectedGamesData2); // prettier-ignore

          return resolve();
        } catch (error) {
          return reject(error);
        }
      });
    });

    // it("should finish to completion when processing 2 match results");
    it("should not save any matches/users/scores when processing 0 match results", function() {
      return new Promise(async (resolve, reject) => {
        try {
          // add teams
          const inTeams: string[][] = [["3336000"], ["3336001"]];
          const allUserIds = Helpers.flatten2Dto1D(inTeams);
          const addTeamsDto: AddTeamsDto = {
            osuUsernamesOrIdsOrSeparators: TestHelpers.convertToTeamDtoArgFormat(inTeams)
          };
          const teamController = iocContainer.get<TeamController>(TYPES.TeamController);
          const addTeamsResponse = await teamController.create({ teamDto: addTeamsDto, requestDto: discordRequest });
          expect(addTeamsResponse.success).to.be.true;

          const input: ApiMultiplayer = {
            multiplayerId: addLobby1Request.banchoMultiplayerId, // Lobby.banchoMultiplayerId
            matches: []
          };

          const expectedGamesData: DataPropertiesOnly<GameEntity[]> = [
            {
              id: 1,
              countFailedScores: createGameRequest.countFailedScores === "true",
              endedAt: null,
              status: GameStatus.IDLE_NEWGAME.getKey(),
              teamLives: createGameRequest.teamLives,
              gameLobbies: [
                {
                  startingMapNumber: 1,
                  removedAt: null,
                  lobby: {
                    id: 1,
                    banchoMultiplayerId: addLobby1Request.banchoMultiplayerId,
                    status: LobbyStatus.AWAITING_FIRST_SCAN.getKey(),
                    matches: []
                  }
                }
              ],
              gameTeams: [
                {
                  colorName: "red",
                  colorValue: "#ff0000",
                  removedAt: null,
                  startingLives: createGameRequest.teamLives,
                  teamNumber: 1,
                  team: {
                    id: 1,
                    name: null,
                    teamOsuUsers: [
                      {
                        id: 1,
                        removedAt: null,
                        osuUser: {
                          id: 1,
                          countryCode: "AU",
                          osuUserId: "3336000",
                          osuUsername: FakeOsuApiFetcher.getFakeBanchoUsername("3336000")
                        }
                      }
                    ]
                  }
                },
                {
                  colorName: "blue",
                  colorValue: "#0000ff",
                  removedAt: null,
                  startingLives: createGameRequest.teamLives,
                  teamNumber: 2,
                  team: {
                    id: 2,
                    name: null,
                    teamOsuUsers: [
                      {
                        id: 2,
                        removedAt: null,
                        osuUser: {
                          id: 2,
                          countryCode: "AU",
                          osuUserId: "3336001",
                          osuUsername: FakeOsuApiFetcher.getFakeBanchoUsername("3336001")
                        }
                      }
                    ]
                  }
                }
              ],
              messageTargets: [
                {
                  authorId: discordRequest.authorId,
                  channelId: discordRequest.originChannelId,
                  channelType: "initial-channel",
                  commType: discordRequest.commType
                }
              ]
            }
          ];

          // process the same API result twice
          const processor1 = new MultiplayerResultsProcessor(input);
          const actualGames1 = await processor1.saveMultiplayerEntities();
          const processor2 = new MultiplayerResultsProcessor(input);
          const actualGames2 = await processor2.saveMultiplayerEntities();
          expect(actualGames2).excludingEvery(["createdAt", "updatedAt"]).to.deep.equal(expectedGamesData); // prettier-ignore

          // ensure database records were only inserted once
          expect(await LobbyEntity.count()).to.equal(1);
          expect(await MatchEntity.count()).to.equal(0);
          expect(await PlayerScoreEntity.count()).to.equal(0);
          expect(await UserEntity.count()).to.equal(3);
          expect(await OsuUserEntity.count()).to.equal(2);

          return resolve();
        } catch (error) {
          return reject(error);
        }
      });
    });
  });

  //   describe("with no tied scores", function() {
  //     it("should ensure exactly 1 team won the match when there are no ties");
  //     it("should ensure exactly 1 team was eliminated when there are no ties");
  //   });

  //   describe("with tied scores", function() {
  //     it("should ensure exactly 1 team won the match when there are 2 ties but no ties were scored by the highest-scoring team");
  //     it("should ensure exactly 0 teams won the match when there are 2 ties and the ties were scored by the highest-scoring teams");
  //     it("should ensure exactly 0 teams won the match when there are 3 ties and the ties were scored by the highest-scoring teams");

  //     it("should ensure exactly 1 team was eliminated when there are 2 ties but no ties were scored by the lowest-scoring team");
  //     it("should ensure exactly 0 teams were eliminated when there are 2 ties and the ties were scored by the lowest-scoring teams");
  //     it("should ensure exactly 0 teams were eliminated when there are 3 ties and the ties were scored by the lowest-scoring teams");
  //   });

  //   describe("with a team to be a winner", function() {
  //     it("should ensure only the highest-scoring team was the winner");
  //   });

  //   describe("with a team to lose a life", function() {
  //     it("should ensure only the lowest-scoring team lost exactly one life");
  //   });

  //   describe("with a team to be eliminated", function() {
  //     it("should ensure that a team losing its last remaining life was the only team eliminated");
  //     it("should ensure that a team losing one of its two lives was NOT eliminated");
  //   });

  //   describe("with an aborted match", function() {
  //     it("should ensure no teams lost a life");
  //     it("should ensure an aborted match report was generated");
  //   });

  //   describe("with a team on a winning streak", function() {
  //     it("should ensure that no teams are marked as having a winning streak when a team wins a match but did not win the previous match");
  //     it("should ensure that only the team winning 2 matches in a row is marked as having a winning streak of 1");
  //     it("should ensure that only the team winning 3 matches in a row is marked as having a winning streak of 2");
  //   });

  //   describe("with leaderboard positions to be determined", function() {
  //     it("should ensure a team gaining 1 position causes the team it overtook to lose 1 position");
  //     it("should ensure a team gaining 1 position is marked as having gained 1 position");
  //     it("should ensure a team gaining 2 positions is marked as having gained 2 positions");
  //     it("should ensure a team losing 1 position is marked as having lost 1 position");
  //     it("should ensure a team losing 2 positions is marked as having lost 2 positions");
  //     it("should ensure the leaderboard is correctly determined from the priority of events", function() {
  //       // See todo note: Team rank/leaderboard @created(19-09-04 10:08)
  //     });
  //   });

  // describe("with only one player playing", function() {
  //   it("should not lose a life", function() {
  //     return new Promise(async (resolve, reject) => {
  //       try {
  //         //  Calculate match results like normal, but no lives are lost. i.e. the game continues forever until another player joins.
  //         return resolve();
  //       } catch (error) {
  //         return reject(error);
  //       }
  //     });
  //   });
  // });

  describe("with many lobbies added to one game", function() {
    xit("should build reports after two lobbies complete the same one map", function() {
      return new Promise(async (resolve, reject) => {
        try {
          // add teams to game 1
          const inTeams: string[][] = [["3336000"], ["3336001"], ["3336100"], ["3336101"]];
          const addTeamsDto: AddTeamsDto = {
            osuUsernamesOrIdsOrSeparators: TestHelpers.convertToTeamDtoArgFormat(inTeams)
          };
          const teamController = iocContainer.get<TeamController>(TYPES.TeamController);
          const addTeamsResponse = await teamController.create({ teamDto: addTeamsDto, requestDto: discordRequest });
          expect(addTeamsResponse.success).to.be.true;

          // add lobby 2 to game 1
          const lobbyController = iocContainer.get<LobbyController>(TYPES.LobbyController);
          const createdLobbyResponse = await lobbyController.create({ lobbyDto: addLobby2Request, requestDto: discordRequest });
          expect(createdLobbyResponse.success).to.be.true;

          // start game 1
          const gameController = iocContainer.get<GameController>(TYPES.GameController);
          const startedGameResponse = await gameController.startGame({ startGameDto: { gameId: 1 }, requestDto: discordRequest });
          expect(startedGameResponse.success).to.be.true;

          const lobby1ApiResults1: ApiMultiplayer = {
            // lobby 1 contains players 1 and 2
            multiplayerId: addLobby1Request.banchoMultiplayerId,
            matches: [
              {
                mapNumber: 1,
                multiplayerId: addLobby1Request.banchoMultiplayerId,
                mapId: "101",
                startTime: new Date().getTime() - 310,
                endTime: new Date().getTime() - 10,
                teamMode: TeamMode.HeadToHead,
                event: "match_end",
                scores: [
                  {
                    osuUserId: "3336000",
                    score: 100000,
                    passed: true
                  },
                  {
                    osuUserId: "3336001",
                    score: 100001,
                    passed: true
                  }
                ]
              }
            ]
          };

          const lobby2ApiResults1: ApiMultiplayer = {
            // lobby 2 contains players 3 and 4
            multiplayerId: addLobby2Request.banchoMultiplayerId,
            matches: [
              {
                // lobby 2 starts beatmap 102 5 seconds after lobby 1
                // lobby 2 completes beatmap 102 5 seconds after lobby 1
                mapNumber: 1,
                multiplayerId: addLobby2Request.banchoMultiplayerId,
                mapId: "102",
                startTime: new Date().getTime() - 305,
                endTime: new Date().getTime() - 5,
                teamMode: TeamMode.HeadToHead,
                event: "match_end",
                scores: [
                  {
                    osuUserId: "3336100",
                    score: 100000,
                    passed: true
                  },
                  {
                    osuUserId: "3336101",
                    score: 100001,
                    passed: true
                  }
                ]
              },
              {
                // lobby 2 completes beatmap 101 110 seconds after lobby 1 completed beatmap 101
                mapNumber: 2,
                multiplayerId: addLobby2Request.banchoMultiplayerId,
                mapId: "101",
                startTime: new Date().getTime(),
                endTime: new Date().getTime() + 100,
                teamMode: TeamMode.HeadToHead,
                event: "match_end",
                scores: [
                  {
                    osuUserId: "3336100",
                    score: 100000,
                    passed: true
                  },
                  {
                    osuUserId: "3336101",
                    score: 100001,
                    passed: true
                  }
                ]
              }
            ]
          };

          const processor1 = new MultiplayerResultsProcessor(lobby1ApiResults1);
          const games1: Game[] = await processor1.saveMultiplayerEntities();
          for (const game of games1) {
            const r1 = processor1.buildBeatmapsGroupedByLobbyPlayedStatusesForGame(game);
            const a = true;
          }
          const processor2 = new MultiplayerResultsProcessor(lobby2ApiResults1);
          const games2: Game[] = await processor2.saveMultiplayerEntities();
          // const r2 = await processor2.buildGameReports(games2);
          for (const game of games2) {
            const r1 = processor1.buildBeatmapsGroupedByLobbyPlayedStatusesForGame(game);
            const a = true;
          }

          // TODO: Create a new test file, extract all the lobbyresults objects setup stuff, and store the results of the processor method calls,
          //        then create individual "it" test methods testing specific parts of those rtesults (e.g. beatmap lobby groups, messages, multiplayer entities, etc.)

          // TODO - assert contents of messages - completed, awaiting, and allLobbiesCompleted

          return resolve();
        } catch (error) {
          return reject(error);
        }
      });
    });

    it("should process the spreadsheet example https://docs.google.com/spreadsheets/d/13GDEfc9s_XgSruD__ht4fQTC8U4D00IQrhxlASg52eA/edit?usp=sharing", function() {
      return new Promise(async (resolve, reject) => {
        try {
          // add teams to game 1 - two teams of two players each
          const inTeams: string[][] = [["p1", "p2"], ["p3", "p4"]];
          const addTeamsDto: AddTeamsDto = {
            osuUsernamesOrIdsOrSeparators: TestHelpers.convertToTeamDtoArgFormat(inTeams)
          };
          const teamController = iocContainer.get<TeamController>(TYPES.TeamController);
          const addTeamsResponse = await teamController.create({ teamDto: addTeamsDto, requestDto: discordRequest });
          expect(addTeamsResponse.success).to.be.true;

          // add lobby 2 to game 1
          const lobbyController = iocContainer.get<LobbyController>(TYPES.LobbyController);
          const createdLobbyResponse = await lobbyController.create({ lobbyDto: addLobby2Request, requestDto: discordRequest });
          expect(createdLobbyResponse.success).to.be.true;

          // start game 1
          const gameController = iocContainer.get<GameController>(TYPES.GameController);
          const startedGameResponse = await gameController.startGame({ startGameDto: { gameId: 1 }, requestDto: discordRequest });
          expect(startedGameResponse.success).to.be.true;

          const lobby1ApiResults1: ApiMultiplayer = {
            multiplayerId: addLobby1Request.banchoMultiplayerId,
            matches: [
              {
                mapNumber: 1,
                multiplayerId: addLobby1Request.banchoMultiplayerId,
                mapId: "BM1",
                startTime: new Date().getTime() + 1,
                endTime: new Date().getTime() + 301,
                teamMode: TeamMode.HeadToHead,
                event: "match_end",
                scores: [
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[0][0]).toString(),
                    score: 100000,
                    passed: true
                  },
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[1][0]).toString(),
                    score: 100001,
                    passed: true
                  }
                ]
              },
              {
                mapNumber: 2,
                multiplayerId: addLobby1Request.banchoMultiplayerId,
                mapId: "BM2",
                startTime: new Date().getTime() + 12,
                endTime: new Date().getTime() + 312,
                teamMode: TeamMode.HeadToHead,
                event: "match_end",
                scores: [
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[0][0]).toString(),
                    score: 100000,
                    passed: true
                  },
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[0][0]).toString(),
                    score: 100001,
                    passed: true
                  }
                ]
              },
              {
                mapNumber: 3,
                multiplayerId: addLobby1Request.banchoMultiplayerId,
                mapId: "BM3", // BM3#1
                startTime: new Date().getTime() + 33,
                endTime: new Date().getTime() + 333,
                teamMode: TeamMode.HeadToHead,
                event: "match_end",
                scores: [
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[0][0]).toString(),
                    score: 100000,
                    passed: true
                  },
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[0][0]).toString(),
                    score: 100001,
                    passed: true
                  }
                ]
              },
              {
                mapNumber: 4,
                multiplayerId: addLobby1Request.banchoMultiplayerId,
                mapId: "BM4",
                startTime: new Date().getTime() + 44,
                endTime: new Date().getTime() + 344,
                teamMode: TeamMode.HeadToHead,
                event: "match_end",
                scores: [
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[0][0]).toString(),
                    score: 100000,
                    passed: true
                  },
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[0][0]).toString(),
                    score: 100001,
                    passed: true
                  }
                ]
              },
              {
                mapNumber: 5,
                multiplayerId: addLobby1Request.banchoMultiplayerId,
                mapId: "BM3", // BM3#2
                startTime: new Date().getTime() + 55,
                endTime: new Date().getTime() + 355,
                teamMode: TeamMode.HeadToHead,
                event: "match_end",
                scores: [
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[0][0]).toString(),
                    score: 100000,
                    passed: true
                  },
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[1][0]).toString(),
                    score: 100001,
                    passed: true
                  }
                ]
              }
            ]
          };

          const lobby2ApiResults1: ApiMultiplayer = {
            multiplayerId: addLobby2Request.banchoMultiplayerId,
            matches: [
              {
                mapNumber: 1,
                multiplayerId: addLobby2Request.banchoMultiplayerId,
                mapId: "BM2",
                startTime: new Date().getTime() + 101,
                endTime: new Date().getTime() + 401,
                teamMode: TeamMode.HeadToHead,
                event: "match_end",
                scores: [
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[0][1]).toString(),
                    score: 100000,
                    passed: true
                  },
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[1][1]).toString(),
                    score: 100001,
                    passed: true
                  }
                ]
              },
              {
                mapNumber: 2,
                multiplayerId: addLobby2Request.banchoMultiplayerId,
                mapId: "BM1",
                startTime: new Date().getTime() + 112,
                endTime: new Date().getTime() + 412,
                teamMode: TeamMode.HeadToHead,
                event: "match_end",
                scores: [
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[0][1]).toString(),
                    score: 100000,
                    passed: true
                  },
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[1][1]).toString(),
                    score: 100001,
                    passed: true
                  }
                ]
              },
              {
                mapNumber: 3,
                multiplayerId: addLobby2Request.banchoMultiplayerId,
                mapId: "BM4",
                startTime: new Date().getTime() + 123,
                endTime: new Date().getTime() + 423,
                teamMode: TeamMode.HeadToHead,
                event: "match_end",
                scores: [
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[0][1]).toString(),
                    score: 100000,
                    passed: true
                  },
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[1][1]).toString(),
                    score: 100001,
                    passed: true
                  }
                ]
              },
              {
                mapNumber: 4,
                multiplayerId: addLobby2Request.banchoMultiplayerId,
                mapId: "BM5",
                startTime: new Date().getTime() + 134,
                endTime: new Date().getTime() + 434,
                teamMode: TeamMode.HeadToHead,
                event: "match_end",
                scores: [
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[0][1]).toString(),
                    score: 100000,
                    passed: true
                  },
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[1][1]).toString(),
                    score: 100001,
                    passed: true
                  }
                ]
              }
            ]
          };

          const lobby2ApiResults2: ApiMultiplayer = {
            multiplayerId: addLobby2Request.banchoMultiplayerId,
            matches: [
              ...lobby2ApiResults1.matches,
              {
                mapNumber: 5,
                multiplayerId: addLobby2Request.banchoMultiplayerId,
                mapId: "BM3",
                startTime: new Date().getTime() + 145,
                endTime: new Date().getTime() + 445,
                teamMode: TeamMode.HeadToHead,
                event: "match_end",
                scores: [
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[0][1]).toString(),
                    score: 100000,
                    passed: true
                  },
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[1][1]).toString(),
                    score: 100001,
                    passed: true
                  }
                ]
              },
              {
                mapNumber: 6,
                multiplayerId: addLobby2Request.banchoMultiplayerId,
                mapId: "BM3",
                startTime: new Date().getTime() + 156,
                endTime: new Date().getTime() + 456,
                teamMode: TeamMode.HeadToHead,
                event: "match_end",
                scores: [
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[0][1]).toString(),
                    score: 100000,
                    passed: true
                  },
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[1][1]).toString(),
                    score: 100001,
                    passed: true
                  }
                ]
              }
            ]
          };

          const lobby1ApiResults2: ApiMultiplayer = {
            multiplayerId: addLobby1Request.banchoMultiplayerId,
            matches: [
              ...lobby1ApiResults1.matches,
              {
                mapNumber: 6,
                multiplayerId: addLobby1Request.banchoMultiplayerId,
                mapId: "BM5",
                startTime: new Date().getTime() + 567,
                endTime: new Date().getTime() + 867,
                teamMode: TeamMode.HeadToHead,
                event: "match_end",
                scores: [
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[0][0]).toString(),
                    score: 100000,
                    passed: true
                  },
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[1][0]).toString(),
                    score: 100001,
                    passed: true
                  }
                ]
              }
            ]
          };

          const lobby2ApiResults3: ApiMultiplayer = {
            multiplayerId: addLobby2Request.banchoMultiplayerId,
            matches: [
              ...lobby2ApiResults2.matches,
              {
                mapNumber: 7,
                multiplayerId: addLobby2Request.banchoMultiplayerId,
                mapId: "BM5", // lobby#2, BM5#2
                startTime: new Date().getTime() + 678,
                endTime: new Date().getTime() + 978,
                teamMode: TeamMode.HeadToHead,
                event: "match_end",
                scores: [
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[0][1]).toString(),
                    score: 100000,
                    passed: true
                  },
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[1][1]).toString(),
                    score: 100001,
                    passed: true
                  }
                ]
              }
            ]
          };

          const lobby1ApiResults3: ApiMultiplayer = {
            multiplayerId: addLobby1Request.banchoMultiplayerId,
            matches: [
              ...lobby1ApiResults2.matches,
              {
                mapNumber: 7,
                multiplayerId: addLobby1Request.banchoMultiplayerId,
                mapId: "BM5",
                startTime: new Date().getTime() + 1200,
                endTime: new Date().getTime() + 1400,
                teamMode: TeamMode.HeadToHead,
                event: "match_end",
                scores: [
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[0][0]).toString(),
                    score: 100000,
                    passed: true
                  },
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[1][0]).toString(),
                    score: 100001,
                    passed: true
                  }
                ]
              }
            ]
          };

          const lobby2ApiResults4: ApiMultiplayer = {
            multiplayerId: addLobby2Request.banchoMultiplayerId,
            matches: [
              ...lobby2ApiResults3.matches,
              {
                mapNumber: 8,
                multiplayerId: addLobby2Request.banchoMultiplayerId,
                mapId: "BM5", // lobby#2, BM5#3
                startTime: new Date().getTime() + 1600,
                endTime: new Date().getTime() + 1800,
                teamMode: TeamMode.HeadToHead,
                event: "match_end",
                scores: [
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[0][1]).toString(),
                    score: 100000,
                    passed: true
                  },
                  {
                    osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(inTeams[1][1]).toString(),
                    score: 100001,
                    passed: true
                  }
                ]
              }
            ]
          };

          const processor1 = new MultiplayerResultsProcessor(lobby1ApiResults1);
          const games1: Game[] = await processor1.saveMultiplayerEntities();
          expect(games1).to.have.lengthOf(1);
          const r1: BeatmapLobbyPlayedStatusGroup[] = processor1.buildBeatmapsGroupedByLobbyPlayedStatusesForGame(games1[0]);
          expect(r1.find(r => r.beatmapId === "BM1" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(1);
          expect(r1.find(r => r.beatmapId === "BM2" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(1);
          expect(r1.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(1);
          expect(r1.find(r => r.beatmapId === "BM4" && r.sameBeatmapNumber === 1).matches).to.have.lengthOf(1);
          expect(r1.find(r => r.beatmapId === "BM3" && r.sameBeatmapNumber === 2).matches).to.have.lengthOf(1);
          expect(r1)
            .excludingEvery(["matches", "id", "status", "gameLobbies", "createdAt", "updatedAt"])
            .to.deep.equal([
              {
                beatmapId: "BM1",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [{ banchoMultiplayerId: addLobby1Request.banchoMultiplayerId }],
                  remaining: [{ banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }],
                  greatestPlayedCount: 1
                }
              },
              {
                beatmapId: "BM2",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [{ banchoMultiplayerId: addLobby1Request.banchoMultiplayerId }],
                  remaining: [{ banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }],
                  greatestPlayedCount: 1
                }
              },
              {
                beatmapId: "BM3",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [{ banchoMultiplayerId: addLobby1Request.banchoMultiplayerId }],
                  remaining: [{ banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }],
                  greatestPlayedCount: 2
                }
              },
              {
                beatmapId: "BM4",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [{ banchoMultiplayerId: addLobby1Request.banchoMultiplayerId }],
                  remaining: [{ banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }],
                  greatestPlayedCount: 1
                }
              },
              {
                beatmapId: "BM3",
                sameBeatmapNumber: 2,
                lobbies: {
                  played: [{ banchoMultiplayerId: addLobby1Request.banchoMultiplayerId }],
                  remaining: [{ banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }],
                  greatestPlayedCount: 2
                }
              }
            ]);

          const processor2 = new MultiplayerResultsProcessor(lobby2ApiResults1);
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
            .to.deep.equal([
              {
                beatmapId: "BM1",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 1
                }
              },
              {
                beatmapId: "BM2",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 1
                }
              },
              {
                beatmapId: "BM3",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [{ banchoMultiplayerId: addLobby1Request.banchoMultiplayerId }],
                  remaining: [{ banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }],
                  greatestPlayedCount: 2
                }
              },
              {
                beatmapId: "BM4",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 1
                }
              },
              {
                beatmapId: "BM3",
                sameBeatmapNumber: 2,
                lobbies: {
                  played: [{ banchoMultiplayerId: addLobby1Request.banchoMultiplayerId }],
                  remaining: [{ banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }],
                  greatestPlayedCount: 2
                }
              },
              {
                beatmapId: "BM5",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [{ banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }],
                  remaining: [{ banchoMultiplayerId: addLobby1Request.banchoMultiplayerId }],
                  greatestPlayedCount: 1
                }
              }
            ]);

          const processor3 = new MultiplayerResultsProcessor(lobby2ApiResults2);
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
            .to.deep.equal([
              {
                beatmapId: "BM1",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 1
                }
              },
              {
                beatmapId: "BM2",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 1
                }
              },
              {
                beatmapId: "BM3",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 2
                }
              },
              {
                beatmapId: "BM4",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 1
                }
              },
              {
                beatmapId: "BM3",
                sameBeatmapNumber: 2,
                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 2
                }
              },
              {
                beatmapId: "BM5",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [{ banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }],
                  remaining: [{ banchoMultiplayerId: addLobby1Request.banchoMultiplayerId }],
                  greatestPlayedCount: 1
                }
              }
            ]);

          const processor4 = new MultiplayerResultsProcessor(lobby1ApiResults2);
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
            .to.deep.equal([
              {
                beatmapId: "BM1",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 1
                }
              },
              {
                beatmapId: "BM2",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 1
                }
              },
              {
                beatmapId: "BM3",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 2
                }
              },
              {
                beatmapId: "BM4",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 1
                }
              },
              {
                beatmapId: "BM3",
                sameBeatmapNumber: 2,
                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 2
                }
              },
              {
                beatmapId: "BM5",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 1
                }
              }
            ]);

          const processor5 = new MultiplayerResultsProcessor(lobby2ApiResults3);
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
            .to.deep.equal([
              {
                beatmapId: "BM1",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 1
                }
              },
              {
                beatmapId: "BM2",
                sameBeatmapNumber: 1,

                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 1
                }
              },
              {
                beatmapId: "BM3",
                sameBeatmapNumber: 1,

                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 2
                }
              },
              {
                beatmapId: "BM4",
                sameBeatmapNumber: 1,

                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 1
                }
              },
              {
                beatmapId: "BM3",
                sameBeatmapNumber: 2,

                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 2
                }
              },
              {
                beatmapId: "BM5",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 2
                }
              },
              {
                beatmapId: "BM5",
                sameBeatmapNumber: 2,
                lobbies: {
                  played: [{ banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }],
                  remaining: [{ banchoMultiplayerId: addLobby1Request.banchoMultiplayerId }],
                  greatestPlayedCount: 2
                }
              }
            ]);

          const processor6 = new MultiplayerResultsProcessor(lobby1ApiResults3);
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
            .to.deep.equal([
              {
                beatmapId: "BM1",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 1
                }
              },
              {
                beatmapId: "BM2",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 1
                }
              },
              {
                beatmapId: "BM3",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 2
                }
              },
              {
                beatmapId: "BM4",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 1
                }
              },
              {
                beatmapId: "BM3",
                sameBeatmapNumber: 2,
                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 2
                }
              },
              {
                beatmapId: "BM5",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 2
                }
              },
              {
                beatmapId: "BM5",
                sameBeatmapNumber: 2,
                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 2
                }
              }
            ]);

          const processor7 = new MultiplayerResultsProcessor(lobby2ApiResults4);
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
            .to.deep.equal([
              {
                beatmapId: "BM1",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 1
                }
              },
              {
                beatmapId: "BM2",
                sameBeatmapNumber: 1,
                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 1
                }
              },
              {
                beatmapId: "BM3",
                sameBeatmapNumber: 1,

                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 2
                }
              },
              {
                beatmapId: "BM4",
                sameBeatmapNumber: 1,

                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 1
                }
              },
              {
                beatmapId: "BM3",
                sameBeatmapNumber: 2,

                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 2
                }
              },
              {
                beatmapId: "BM5",
                sameBeatmapNumber: 1,

                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 3
                }
              },
              {
                beatmapId: "BM5",
                sameBeatmapNumber: 2,
                lobbies: {
                  played: [
                    { banchoMultiplayerId: addLobby1Request.banchoMultiplayerId },
                    { banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }
                  ],
                  remaining: [],
                  greatestPlayedCount: 3
                }
              },
              {
                beatmapId: "BM5",
                sameBeatmapNumber: 3,
                lobbies: {
                  played: [{ banchoMultiplayerId: addLobby2Request.banchoMultiplayerId }],
                  remaining: [{ banchoMultiplayerId: addLobby1Request.banchoMultiplayerId }],
                  greatestPlayedCount: 3
                }
              }
            ]);

          const gameRepository: GameRepository = getCustomRepository(GameRepository);
          const reportedMatches: Match[] = await gameRepository.getReportedMatchesForGame(games7[0].id);
          const allGameLobbies: Lobby[] = games7[0].gameLobbies.map(gl => gl.lobby);
          const messages: LobbyBeatmapStatusMessageTypes[] = processor7.buildLobbyMatchReportMessages({
            beatmapsPlayed: blg7,
            reportedMatches,
            allGameLobbies
          });

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

    xit("should deliver a message saying 'waiting for results for lobbies A,B,etc' if not all lobbies have completed a map", function() {
      return new Promise(async (resolve, reject) => {
        try {
          return reject();
          return resolve();
        } catch (error) {
          return reject(error);
        }
      });
    });
    xit("should deliver results for a map when that map is played in a different order in three lobbies", function() {
      return new Promise(async (resolve, reject) => {
        try {
          return reject();
          return resolve();
        } catch (error) {
          return reject(error);
        }
      });
    });

    xit("should calculate scores correctly after a player swaps from one lobby to another", function() {
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

  describe("with one lobby added to many games", function() {
    xit("should send a report to the message target channels of all those games", function() {
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
});

function getLeaderboardLineOfUser(reports: GameReport[], targetUserId: string): LeaderboardLine {
  const lines = reports[0].leaderboardLines.filter(ll => ll.team.members.map(m => m.osuUserId).includes(targetUserId));
  if (lines.length < 1) throw new Error("Player does not exist in any leaderboard lines.");
  if (lines.length > 1) throw new Error("Player should not exist in more than one leaderboard line.");
  return lines[0];
}

/*
          ResultsBuilder.game({ startingLives: 2, failsCounted: false })
            .teams({ players: [["u1", "u2"], ["u3"]] })
            .matches({ total: 5 }) // max matches played before game end = (startingLives * teamSize - 1 + matchesAborted)
            .scores({
              match: 1,
              scores: [
                { player: "u1", score: 10, passed: true },
                { player: "u2", score: 20, passed: true },
                { player: "u3", score: 40, passed: true }
              ]
            })
            .matchAborted({ match: 1 }) // match still saved in DB, but no results from this match should be counted
            .playerLeaves({ player: "u1", afterMatchStart: 3 }) // meaning player u1 WILL NOT submit a score for match 3
            .playerJoins({ player: "u4", beforeMatchStart: 4 }) // meaning player u4 WILL submit a score for match 4
            .matchAborted({ match: 5 })
            .apiFetch({ matches: "1-3" }); // any matches not included here will be fetched one by one
*/

/*

          // // lobby
          // expect(actualReports[0].lobby.banchoLobbyId).to.equal(inputMultiResults.matches[0].multiplayerId);
          // expect(actualReports[0].lobby.lobbyName).to.be.not.null;
          // expect(actualReports[0].lobby.resultsUrl).to.be.not.null;
          // // match report
          // expect(actualReports[0].match.beatmap.mapId).to.equal(inputMultiResults.matches[0].mapId);
          // expect(actualReports[0].match.beatmap.mapString).to.be.not.null;
          // expect(actualReports[0].match.beatmap.mapUrl).to.be.not.null;
          // expect(actualReports[0].match.endTime).to.equal(inputMultiResults.matches[0].endTime);
          // // expect(reports[0].match.forcedMods).to.equal();
          // // expect(reports[0].match.playMode);
          // // expect(reports[0].match.scoringType)
          // expect(actualReports[0].match.startTime).to.equal(inputMultiResults.matches[0].startTime);
          // expect(actualReports[0].match.status).to.equal("aborted" as MatchStatus);
          // expect(actualReports[0].match.teamType).to.equal(ApiTeamMode.HeadToHead);
          // expect(actualReports[0].match).to.equal(ApiTeamMode.HeadToHead);
          // // team lines
          // expect(actualReports[0].leaderboardLines.length).to.equal(2, "There are two teams, so there should be two leaderboard lines.");
          // expect(actualReports[0].leaderboardLines[0].team.colorName).to.be.not.null;
          // expect(actualReports[0].leaderboardLines[0].team.colorValue).to.be.not.null;
          // expect(actualReports[0].leaderboardLines[0].team.position).to.be.not.null;
          // const user1LeaderboardLine = getLeaderboardLineOfUser(actualReports, teamsOfUserIds[0][0]);
          // expect(user1LeaderboardLine.teamScore).to.equal(100000);
          // expect(user1LeaderboardLine.teamStatus.isEliminated).to.equal(false);
          // expect(user1LeaderboardLine.teamStatus.justEliminated).to.equal(false);
          // expect(user1LeaderboardLine.teamStatus.lives).to.equal(
          //   gameSettings.startingLives - 1,
          //   "Team 1 lost, so they should have lost a life."
          // );
          // const user2LeaderboardLine = getLeaderboardLineOfUser(actualReports, teamsOfUserIds[0][1]);
          // expect(user2LeaderboardLine.teamScore).to.equal(100001);
          // expect(user2LeaderboardLine.teamStatus.isEliminated).to.equal(false);
          // expect(user2LeaderboardLine.teamStatus.justEliminated).to.equal(false);
          // expect(user2LeaderboardLine.teamStatus.lives).to.equal(
          //   gameSettings.startingLives,
          //   "Team 2 won, so they should not have lost a life."
          // );

 */
