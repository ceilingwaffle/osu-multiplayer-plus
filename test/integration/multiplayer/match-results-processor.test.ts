import "../../../src/index";
import "mocha";
import { assert, expect } from "chai";
import { MultiplayerResultsProcessor } from "../../../src/multiplayer/multiplayer-results-processor";
import { ApiMultiplayer } from "../../../src/osu/types/api-multiplayer";
import { ApiTeamMode } from "../../../src/osu/types/api-team-mode";
import { MatchReport } from "../../../src/multiplayer/reports/match.report";
import { MatchStatus } from "../../../src/multiplayer/components/match-status";
import { LeaderboardLine } from "../../../src/multiplayer/components/leaderboard-line";
import { AssertionError } from "assert";

// // arrange: ApiMultiplayer object
// // act: MultiplayerResultsService...
// // assert: MatchResults object

describe("When processing multiplayer results", function() {
  describe("with a number of results", function() {
    it("should accurately report on 1 API result containing 1 match result", function() {
      return new Promise(async (resolve, reject) => {
        try {
          // 2 teams => 2 scores
          // 2 players total
          // 1 player per team
          // 1 API result total
          // 1 match result
          // all scores passing
          // match completed (not aborted)
          // match ended (MatchEvent)
          const teamsOfUserIds: string[][] = [["3336000"], ["3336001"]];
          const gameSettings: { startingLives: number } = {
            startingLives: 2
          };
          const inputMultiResults: ApiMultiplayer = {
            multiplayerId: "1234",
            matches: [
              {
                mapNumber: 1,
                multiplayerId: 1234,
                mapId: 4178,
                startTime: new Date(new Date().getTime() - 300),
                endTime: new Date(),
                teamMode: ApiTeamMode.HeadToHead,
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
            ]]
          };

          const expectedReports: MatchReport[] = [
            {
              lobby: {
                banchoLobbyId: inputMultiResults.multiplayerId,
                lobbyName: null,
                resultsUrl: null
              },
              match: {
                startTime: inputMultiResults.matches[0].startTime,
                endTime: inputMultiResults.matches[0].endTime,
                playMode: null,
                scoringType: null,
                teamType: null,
                forcedMods: null,
                beatmap: null,
                status: "completed"
              },
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
                        osuUsername: "",
                        countryCode: "",
                        countryEmoji: ""
                      }
                    ]
                  },
                  teamStatus: {
                    isEliminated: false,
                    justEliminated: false,
                    lives: 2 - 1 // team 1 scored lower than team 2, so they lose a life
                  },
                  teamScore: {
                    teamScore: 100000,
                    playerScores: [
                      {
                        osuUserId: "3336000",
                        passed: true,
                        score: 100000,
                        mods: ""
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
                        osuUsername: "",
                        countryCode: "",
                        countryEmoji: ""
                      }
                    ]
                  },
                  teamStatus: {
                    isEliminated: false,
                    justEliminated: false,
                    lives: 2
                  },
                  teamScore: {
                    teamScore: 100001,
                    playerScores: [
                      {
                        osuUserId: "3336001",
                        passed: true,
                        score: 100001,
                        mods: ""
                      }
                    ]
                  }
                }
              ]
            }
          ];

          const processor = new MultiplayerResultsProcessor(inputMultiResults);
          const actualReports: MatchReport[] = await processor.process();

          expect(actualReports).to.deep.equal(expectedReports);

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
function getLeaderboardLineOfUser(reports: MatchReport[], targetUserId: string): LeaderboardLine {
  const lines = reports[0].leaderboardLines.filter(ll => ll.team.members.map(m => m.osuUserId).includes(targetUserId));
  if (lines.length < 1) throw new Error("Player exist in one leaderboard line.");
  if (lines.length > 1) throw new Error("Player should not exist in more than one leaderboard line.");
  return lines[0];
}
