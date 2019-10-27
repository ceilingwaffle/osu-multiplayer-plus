import { ReportableContext, ReportableContextType } from "../../domain/game/game-match-reported.entity";
import { Game } from "../../domain/game/game.entity";
import { TeamScoredLowestGameEvent } from "../game-events/team-scored-lowest.game-event";
import { Leaderboard } from "../components/leaderboard";
import { LeaderboardLine, LeaderboardLinePlayer, LeaderboardPositionals } from "../components/leaderboard-line";
import _ = require("lodash"); // do not convert to default import -- it will break!!
import { Log } from "../../utils/Log";
import { Team } from "../../domain/team/team.entity";
import { VirtualMatch } from "../virtual-match/virtual-match";
import { PlayerScore as PlayerScoreEntity } from "../../domain/score/player-score.entity";
import { TeamID } from "../components/types/team-id";
import { TeamScoresSubmittedGameEvent } from "../game-events/team-scores-submitted.game-event";
import { TeamScoreCalculator } from "../classes/team-score-calculator";

interface GameSettings {
  countFailedScores: boolean;
  startingTeamLives: number;
}

export class LeaderboardBuilder {
  /**
   * Builds the latest leaderboard from all the reportables of a game.
   *
   * @static
   * @param {{ game: Game; reportables: ReportableContext<ReportableContextType>[] }} args
   * @returns {ReportableContext<"leaderboard">}
   */
  static buildLeaderboard(args: {
    game: Game;
    reportables: ReportableContext<ReportableContextType>[];
    // virtualMatches: VirtualMatch[];
  }): ReportableContext<"leaderboard"> {
    const gameSettings: GameSettings = {
      countFailedScores: args.game.countFailedScores,
      startingTeamLives: args.game.teamLives
    };

    const teams = args.game.gameTeams.map(gameTeam => gameTeam.team);
    if (!teams.length) {
      Log.warn("Cannot build leaderboard because game has no teams.");
      return undefined;
    }

    const teamScoredLowestEvents = args.reportables
      .filter(r => r.type === "game_event" && r.subType === "team_scored_lowest")
      .map(reportable => reportable.item as TeamScoredLowestGameEvent)
      .sort((a, b) => a.data.timeOfEvent - b.data.timeOfEvent);

    if (!teamScoredLowestEvents.length) {
      Log.warn(`Cannot build leaderboard because there were no ${TeamScoredLowestGameEvent.constructor.name} events to process.`);
      return undefined;
    }

    const teamScoresSubmittedEvents = args.reportables
      .filter(r => r.type === "game_event" && r.subType === "team_scores_submitted")
      .map(reportable => reportable.item as TeamScoresSubmittedGameEvent)
      .sort((a, b) => a.data.timeOfEvent - b.data.timeOfEvent);

    if (!teamScoresSubmittedEvents.length) {
      Log.warn(`Cannot build leaderboard because there were no ${TeamScoresSubmittedGameEvent.constructor.name} events to process.`);
      return undefined;
    }

    const teamLives: Map<TeamID, number> = LeaderboardBuilder.calculateTeamLives(teamScoredLowestEvents, gameSettings.startingTeamLives);

    // const teamScoresTotal: Map<TeamID, number> = LeaderboardBuilder.calculateTotalTeamScoresForEntireGame(teamScoresSubmittedEvents, teams);
    const lastTeamScoreSubmittedEvent = teamScoresSubmittedEvents.slice(-1)[0];
    const lastVirtualMatch = lastTeamScoreSubmittedEvent.data.eventMatch;
    const teamScoresForLastEvent = TeamScoreCalculator.calculateTeamScoresForVirtualMatch(lastVirtualMatch, teams);

    const leaderboard: Leaderboard = {
      beatmapId: lastVirtualMatch.beatmapId,
      sameBeatmapNumber: lastVirtualMatch.sameBeatmapNumber,
      beatmapPlayed: {
        mapId: lastVirtualMatch.beatmapId,
        // TODO: Build beatmap from VirtualMatchCompletedGameEvent
        mapUrl: null,
        mapString: null,
        stars: null
      },
      leaderboardLines: args.game.gameTeams.map<LeaderboardLine>(gt => {
        const teamScore = teamScoresForLastEvent.find(ts => ts.teamId === gt.team.id);

        return {
          team: {
            teamName: gt.team.name,
            teamNumber: gt.teamNumber,
            players: gt.team.teamOsuUsers.map<LeaderboardLinePlayer>(tou => {
              const thisPlayerScores = lastVirtualMatch.matches.map(m =>
                m.playerScores.find(ps => ps.scoredBy.osuUserId === tou.osuUser.osuUserId)
              );
              const playerScore = thisPlayerScores.length && thisPlayerScores[0] ? thisPlayerScores[0] : null;
              const highestScoringTeamPlayerScores = LeaderboardBuilder.getHighestPlayerScoresOfVirtualMatchForTeam(
                gt.team,
                lastVirtualMatch
              );
              return {
                osuUserId: tou.osuUser.osuUserId,
                osuUsername: tou.osuUser.osuUsername,
                scoreSubmitted: !!playerScore,
                score: {
                  score: playerScore ? playerScore.score || 0 : 0,
                  scoreLetterGrade: playerScore ? playerScore.scoreLetterGrade : undefined,
                  accuracy: playerScore ? playerScore.accuracy : undefined,
                  // may have multiple highest-scoring players if they all tied the highest score
                  highestScoreInTeam: !!highestScoringTeamPlayerScores.find(sps => sps.scoredBy.osuUserId === tou.osuUser.osuUserId)
                }
              };
            })
          },
          alive: LeaderboardBuilder.isTeamAlive(gameSettings.startingTeamLives, gt.team, teamScoredLowestEvents),
          position: LeaderboardBuilder.getTeamPositionalsForTeam(teamScoresSubmittedEvents, gt.team.id),
          lives: {
            currentLives: teamLives.get(gt.team.id),
            startingLives: gameSettings.startingTeamLives
          },
          teamScore: {
            teamScore: teamScore ? teamScore.score : 0
          }
        };
      })
    };

    return {
      beatmapId: lastVirtualMatch.beatmapId,
      sameBeatmapNumber: lastVirtualMatch.sameBeatmapNumber,
      time: lastTeamScoreSubmittedEvent.data.timeOfEvent,
      type: "leaderboard",
      subType: "battle_royale",
      item: leaderboard
    };
  }

  /**
   * Returns the latest team leaderboard positions (current and previous) for the given team ID, determined from the given events.
   *
   * @static
   * @param {TeamScoresSubmittedGameEvent[]} scoresSubmittedEvents
   * @param {number} targetTeamId
   * @returns {(LeaderboardPositionals | undefined)}
   */
  private static getTeamPositionalsForTeam(
    scoresSubmittedEvents: TeamScoresSubmittedGameEvent[],
    targetTeamId: number
  ): LeaderboardPositionals | undefined {
    // TODO: Position should be locked if the team was eliminated

    // team will not have a rank defined if they did not submit a score
    const latestEvent = scoresSubmittedEvents.slice(-1)[0];
    if (!latestEvent || !latestEvent.data || !latestEvent.data.data) {
      Log.warn("Unable to calculate team leaderboard positions because there are no score submitted events. This should never happen.");
      return undefined;
    }

    const currentPosition = latestEvent.data.data.get(targetTeamId).rank;

    const prevEvent = scoresSubmittedEvents.slice(-2)[0];
    if (!prevEvent || !prevEvent.data || !prevEvent.data.data) {
      // since we don't know the previous position, the previous position and the change in position are both unknown and (therefore) undefined
      return { currentPosition };
    }

    const previousPosition = prevEvent.data.data.get(targetTeamId).rank;

    return {
      currentPosition,
      previousPosition,
      change: previousPosition - currentPosition > 0 ? "gained" : previousPosition - currentPosition === 0 ? "same" : "lost"
    };
  }

  /**
   * Returns true if the given team is considered alive (i.e. not eliminated).
   *
   * @private
   * @static
   * @param {number} startingTeamLives
   * @param {Team} team
   * @param {TeamScoredLowestGameEvent[]} events
   * @returns {boolean}
   */
  private static isTeamAlive(startingTeamLives: number, team: Team, events: TeamScoredLowestGameEvent[]): boolean {
    const teamLosingEvents = events.filter(event => event.type === "team_scored_lowest" && event.data.teamId === team.id);
    if (!teamLosingEvents.length) {
      // team is alive if no losing events occurred for this team
      return true;
    }

    const teamLostCount = teamLosingEvents.length;

    // team is NOT alive if they lost at least the same number as the lives they started with
    return teamLostCount < startingTeamLives;
  }

  /**
   * Returns the PlayerScore objects having the highest score values (multiple returned if multiple highest scores are tied).
   *
   * @private
   * @static
   * @param {Team} team
   * @param {VirtualMatch} virtualMatch
   * @returns {PlayerScoreEntity[]}
   */
  private static getHighestPlayerScoresOfVirtualMatchForTeam(team: Team, virtualMatch: VirtualMatch): PlayerScoreEntity[] {
    const teamPlayerScoresLowestToHighest = _(virtualMatch.matches)
      .map(m => m.playerScores)
      .flattenDeep()
      .filter(playerScore => !!team.teamOsuUsers.find(tou => tou.osuUser.osuUserId === playerScore.scoredBy.osuUserId))
      // .flattenDeep()
      .sort((a, b) => a.score - b.score)
      .value();

    if (!teamPlayerScoresLowestToHighest || !teamPlayerScoresLowestToHighest.length) {
      // no players from the target team scored in the target virtual match
      return [];
    }

    // check for tied scores
    const highestOrTiedScorePlayerScore = teamPlayerScoresLowestToHighest.slice(-1)[0];
    if (!highestOrTiedScorePlayerScore) {
      // no players from the target team scored in the target virtual match
      return [];
    }
    const highestScore = highestOrTiedScorePlayerScore.score;
    const highestScoringTeamPlayerScores = teamPlayerScoresLowestToHighest.filter(sps => sps.score === highestScore);
    return highestScoringTeamPlayerScores;
  }

  /**
   * Returns a map of team IDs mapped to their number of lives remaining after the last event.
   *
   * @private
   * @static
   * @param {TeamScoredLowestGameEvent[]} events Should be sorted in ascending order of when the event occurred.
   * @param {number} startingTeamLives
   * @returns {Map<TeamID, number>}
   */
  private static calculateTeamLives(events: TeamScoredLowestGameEvent[], startingTeamLives: number): Map<TeamID, number> {
    const teamLives = new Map<TeamID, number>();
    if (!events || !events.length) return teamLives;
    events.forEach(event => {
      const teamId = event.data.teamId;
      const currentLives = teamLives.get(teamId) || startingTeamLives;
      teamLives.set(teamId, currentLives - 1 < 0 ? 0 : currentLives - 1);
    });
    return teamLives;
  }

  // private static getCurrentLeaderboardPositionOfTeam(
  //   teamId: TeamID,
  //   allTeamLives: Map<TeamID, number>,
  //   allTeamScoresTotal: Map<TeamID, number>
  // ): number | undefined {
  //   // position is determined by number of lives remaining.
  //   // if same number of lives remaining, fallback to total team score

  //   const positionsBestToWorst = new Map<TeamID, { position?: number; lives?: number; totalScore?: number }>();

  //   allTeamLives.forEach((teamLives, teamId, _allTeamLives) => {
  //     const found = positionsBestToWorst.get(teamId);
  //     if (!found) positionsBestToWorst.set(teamId, { lives: teamLives });
  //     else found.lives = teamLives;
  //   });
  //   allTeamScoresTotal.forEach((teamTotalScore, teamId, _allTeamScoresTotal) => {
  //     const found = positionsBestToWorst.get(teamId);
  //     if (!found) positionsBestToWorst.set(teamId, { totalScore: teamTotalScore });
  //     else found.totalScore = teamTotalScore;
  //   });

  //   const positionsBestToWorstArray = Array.from(positionsBestToWorst).sort((a, b) => {
  //     // sort by scores highest to lowest
  //     if (b[1] && b[1].lives && a[1] && a[1].lives) {
  //       const livesDiff = b[1].lives - a[1].lives;
  //       if (livesDiff !== 0) return livesDiff;
  //     }
  //     if (b[1] && b[1].totalScore && a[1] && a[1].totalScore) {
  //       const scoresDiff = b[1].totalScore - a[1].totalScore;
  //       return scoresDiff;
  //     }
  //     return 0;
  //     // TODO - improve this. Not perfect, since teams may (very rarely) have identical total scores.
  //   });

  //   positionsBestToWorstArray.forEach((position, index) => (position[1].position = index + 1));

  //   const teamPosition = positionsBestToWorstArray.find(position => teamId === position[0]);
  //   if (!teamPosition || !teamPosition[1] || teamPosition[1].position < 1) {
  //     return undefined;
  //   }

  //   return teamPosition[1].position;
  // }

  // /**
  //  * Returns a map of team IDs mapped to the sum of all scores that each team has scored in the matches of the given game events.
  //  *
  //  * @private
  //  * @static
  //  * @param {TeamScoresSubmittedGameEvent[]} events Should be sorted in ascending order of when the event occurred.
  //  * @param {Team[]} teams
  //  * @returns {Map<TeamID, number>}
  //  */
  // private static calculateTotalTeamScoresForEntireGame(events: TeamScoresSubmittedGameEvent[], teams: Team[]): Map<TeamID, number> {
  //   if (!events || !events.length) return;
  //   // Just using the TeamScoresSubmittedGameEvent here to avoid calculating the same match more than once.
  //   // This could really be any event, as long as that event occurs only once per virtual match.
  //   const teamScores = new Map<TeamID, number>();
  //   events.forEach(event => {
  //     event.data.eventMatch.matches.forEach(match => {
  //       for (const playerScore of match.playerScores) {
  //         const team = teams.find(team => team.teamOsuUsers.find(tou => tou.osuUser.osuUserId === playerScore.scoredBy.osuUserId));
  //         if (!team) {
  //           // Disregard a player's score if that player has not been added to any team for this game.
  //           continue;
  //         }
  //         const teamScore = teamScores.get(team.id) || 0;
  //         teamScores.set(team.id, teamScore + playerScore.score);
  //       }
  //     });
  //   });
  //   return teamScores;
  // }
}
