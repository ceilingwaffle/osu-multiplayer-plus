import "../../../src/index";
import "mocha";
import * as chai from "chai";
import { assert, expect } from "chai";
import { MultiplayerResultsProcessor } from "../../../src/multiplayer/multiplayer-results-processor";
import { ApiMultiplayer } from "../../../src/osu/types/api-multiplayer";
import { TeamMode } from "../../../src/multiplayer/components/enums/team-mode";
import { GameReport } from "../../../src/multiplayer/reports/game.report";
import { LeaderboardLine } from "../../../src/multiplayer/components/leaderboard-line";
import { TestHelpers } from "../../test-helpers";
import { Lobby } from "../../../src/domain/lobby/lobby.entity";
import { LobbyStatus } from "../../../src/domain/lobby/lobby-status";
import { FakeOsuApiFetcher } from "../../classes/fake-osu-api-fetcher";
import chaiExclude from "chai-exclude";
import { DataPropertiesOnly } from "../../../src/utils/data-properties-only";
import { PlayMode } from "../../../src/multiplayer/components/enums/play-mode";
import { ScoringType } from "../../../src/multiplayer/components/enums/scoring-type";
import { Mods } from "../../../src/multiplayer/components/enums/mods";
import { MatchStatus } from "../../../src/multiplayer/components/types/match-status";

chai.use(chaiExclude);

// // arrange: ApiMultiplayer object
// // act: MultiplayerResultsService...
// // assert: MatchResults object

describe("When processing multiplayer results", function() {
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

  describe("with a number of results", function() {
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
          const teamsOfUids: string[][] = [["3336000"], ["3336001"]];
          const gameSettings: { startingLives: number } = {
            startingLives: 2
          };

          const input: ApiMultiplayer = {
            multiplayerId: "1234", // Lobby.banchoMultiplayerId
            matches: [
              {
                mapNumber: 1, // GameLobby.startingMapNumber
                multiplayerId: 1234, // Lobby.banchoMultiplayerId
                mapId: 4178, // Match.beatmapId
                startTime: new Date(new Date().getTime() - 300), // Match.startTime
                endTime: new Date(), // Match.endTime
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

          const expectedLobby: DataPropertiesOnly<Lobby> = {
            id: 1,
            banchoMultiplayerId: "1234",
            status: LobbyStatus.AWAITING_FIRST_SCAN.getKey(),
            gameLobbies: [],
            matches: [
              {
                id: 1,
                mapNumber: 1,
                beatmapId: "4178",
                startTime: input.matches[0].startTime.getTime(),
                endTime: input.matches[0].endTime.getTime(),
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
                        id: 1
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
                        id: 2
                      }
                    }
                  }
                ]
              }
            ]
          };

          const processor = new MultiplayerResultsProcessor(input);
          const actualLobby = await processor.process();

          expect(actualLobby).excludingEvery(["createdAt", "updatedAt", "scoredInMatch", "lobby"]).to.deep.equal(expectedLobby); // prettier-ignore

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
                    lives: gameSettings.startingLives - 1 // team 1 scored lower than team 2, so they lose a life
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
                    lives: gameSettings.startingLives
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

          // const actualReports: GameReport[] = await processor.buildReport();

          // expect(actualReports).to.deep.equal(expectedReports);

          return resolve();
        } catch (error) {
          return reject(error);
        }
      });
    });

    it("should process and save 2 API result containing 1 match result each", function() {
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
          const teamsOfUids: string[][] = [["3336000"], ["3336001"]];
          const gameSettings: { startingLives: number } = {
            startingLives: 2
          };

          const apiResult1: ApiMultiplayer = {
            multiplayerId: "1234", // Lobby.banchoMultiplayerId
            matches: [
              {
                mapNumber: 1, // GameLobby.startingMapNumber
                multiplayerId: 1234, // Lobby.banchoMultiplayerId
                mapId: 4178, // Match.beatmapId
                startTime: new Date(new Date().getTime() - 300), // Match.startTime
                endTime: new Date(), // Match.endTime
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

          const expectedLobby1: DataPropertiesOnly<Lobby> = {
            id: 1,
            banchoMultiplayerId: "1234",
            status: LobbyStatus.AWAITING_FIRST_SCAN.getKey(),
            gameLobbies: [],
            matches: [
              {
                id: 1,
                mapNumber: 1,
                beatmapId: "4178",
                startTime: apiResult1.matches[0].startTime.getTime(),
                endTime: apiResult1.matches[0].endTime.getTime(),
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
                        id: 1
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
                        id: 2
                      }
                    }
                  }
                ]
              }
            ]
          };

          const processor = new MultiplayerResultsProcessor(apiResult1);
          const actualLobby = await processor.process();

          expect(actualLobby).excludingEvery(["createdAt", "updatedAt", "scoredInMatch", "lobby"]).to.deep.equal(expectedLobby1); // prettier-ignore

          const apiResult2: ApiMultiplayer = {
            multiplayerId: "1234", // Lobby.banchoMultiplayerId
            matches: [
              {
                mapNumber: 2, // GameLobby.startingMapNumber
                multiplayerId: 1234, // Lobby.banchoMultiplayerId
                mapId: 6666, // Match.beatmapId
                startTime: new Date(new Date().getTime() - 300), // Match.startTime
                endTime: new Date(), // Match.endTime
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

          const expectedLobby2: DataPropertiesOnly<Lobby> = {
            id: 1,
            banchoMultiplayerId: "1234",
            status: LobbyStatus.AWAITING_FIRST_SCAN.getKey(),
            gameLobbies: [],
            matches: [
              expectedLobby1.matches[0],
              {
                id: 2,
                mapNumber: 2,
                beatmapId: "6666",
                startTime: apiResult2.matches[0].startTime.getTime(),
                endTime: apiResult2.matches[0].endTime.getTime(),
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
                        id: 1
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
                        id: 2
                      }
                    }
                  }
                ]
              }
            ]
          };

          const processor2 = new MultiplayerResultsProcessor(apiResult2);
          const actualLobby2 = await processor2.process();

          expect(actualLobby2).excludingEvery(["createdAt", "updatedAt", "scoredInMatch", "lobby"]).to.deep.equal(expectedLobby2); // prettier-ignore

          return resolve();
        } catch (error) {
          return reject(error);
        }
      });
    });

    // it("should finish to completion when processing 2 match results");
    // it("should not throw an error when processing 0 match results");
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

  //   describe("with leaderboard positioned to be determined", function() {
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
});
function getLeaderboardLineOfUser(reports: GameReport[], targetUserId: string): LeaderboardLine {
  const lines = reports[0].leaderboardLines.filter(ll => ll.team.members.map(m => m.osuUserId).includes(targetUserId));
  if (lines.length < 1) throw new Error("Player exist in one leaderboard line.");
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
