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
import { TeamScoreCalculator, CalculatedTeamScore } from "../classes/team-score-calculator";
import { VirtualMatchCreator } from "../virtual-match/virtual-match-creator";

type GameSettings = { countFailedScores: boolean; startingTeamLives: number };
type TeamLivesMap = Map<TeamID, { lives: number; eliminatedInEvent?: TeamScoredLowestGameEvent }>;
type TeamAverageRanksMap = Map<TeamID, { virtualMatchAverageRank: number }>;
type TeamScoresMap = Map<TeamID, { score: number }>;
type TeamScoreRankData = { submitted: boolean; score?: number; rank: number };

export class LeaderboardBuilder {
  /**
   * Builds the latest leaderboard from all the reportables of a game.
   *
   * @static
   * @param {{ game: Game; reportables: ReportableContext<ReportableContextType>[] }} args
   * @returns {ReportableContext<"leaderboard">}
   */
  static buildLeaderboard(args: { game: Game; reportables: ReportableContext<ReportableContextType>[] }): ReportableContext<"leaderboard"> {
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

    const lastTeamScoreSubmittedEvent = teamScoresSubmittedEvents.slice(-1)[0];
    const lastVirtualMatch = lastTeamScoreSubmittedEvent.data.eventMatch;
    const teamScoresForLastVirtualMatch = TeamScoreCalculator.calculateTeamScoresForVirtualMatch(lastVirtualMatch, teams);
    const teamLives: TeamLivesMap = LeaderboardBuilder.calculateCurrentTeamLives(teamScoredLowestEvents, gameSettings.startingTeamLives);

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
        const teamScore = teamScoresForLastVirtualMatch.find(ts => ts.teamId === gt.team.id);

        const teamPositionals = LeaderboardBuilder.getTeamPositionals({
          targetTeamId: gt.team.id,
          targetEvent: lastTeamScoreSubmittedEvent,
          teamScoresSubmittedEvents,
          teamScoredLowestEvents,
          teams,
          gameSettings
        });

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
          position: teamPositionals,
          lives: {
            currentLives: teamLives.get(gt.team.id).lives,
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
   * Returns average "per virtual match" leaderboard position after the moment of the last of the given events.
   *
   * @static
   * @param {TeamScoresSubmittedGameEvent[]} teamScoresSubmittedEvents
   * @param {Team[]} teams
   * @param {Map<number, TeamLivesMap>} teamLives
   * @returns {Map<number, TeamAverageRanksMap>}
   */
  static calculateCurrentTeamRankAverages(
    teamScoresSubmittedEvents: TeamScoresSubmittedGameEvent[],
    teams: Team[],
    teamLives: TeamLivesMap
  ): TeamAverageRanksMap {
    throw new Error("TODO: Implement method of LeaderboardBuilder.");
  }

  // /**
  //  * Returns the latest team leaderboard positions (current and previous) for the given team ID, determined from the given events.
  //  *
  //  * @static
  //  * @param {TeamScoresSubmittedGameEvent[]} scoresSubmittedEvents
  //  * @param {number} targetTeamId
  //  * @returns {(LeaderboardPositionals | undefined)}
  //  */
  // private static getTeamPositionalsForTeam(
  //   scoresSubmittedEvents: TeamScoresSubmittedGameEvent[],
  //   targetTeamId: number
  // ): LeaderboardPositionals | undefined {
  //   // TODO: Position should be locked if the team was eliminated

  //   // team will not have a rank defined if they did not submit a score
  //   const latestEvent = scoresSubmittedEvents.slice(-1)[0];
  //   if (!latestEvent || !latestEvent.data || !latestEvent.data.data) {
  //     Log.warn("Unable to calculate team leaderboard positions because there are no score submitted events. This should never happen.");
  //     return undefined;
  //   }

  //   const currentPosition = LeaderboardBuilder.determineTeamPositionsForVirtualMatch(latestEvent.data.eventMatch);

  //   const prevEvent = scoresSubmittedEvents.slice(-2)[0];
  //   if (!prevEvent || !prevEvent.data || !prevEvent.data.data) {
  //     // since we don't know the previous position, the previous position and the change in position are both unknown and (therefore) undefined
  //     return { currentPosition };
  //   }

  //   const previousPosition = prevEvent.data.data.get(targetTeamId).rank;

  //   return {
  //     currentPosition,
  //     previousPosition,
  //     change: previousPosition - currentPosition > 0 ? "gained" : previousPosition - currentPosition === 0 ? "same" : "lost"
  //   };
  // }

  private static getTeamPositionals(args: {
    targetTeamId: TeamID; // get the positionals for this team ID
    targetEvent: TeamScoresSubmittedGameEvent; // get the positions at the time of this event
    teamScoresSubmittedEvents: TeamScoresSubmittedGameEvent[]; // all the game events thus far (must include the targetEvent)
    teamScoredLowestEvents: TeamScoredLowestGameEvent[];
    teams: Team[]; // all the teams added to the game
    gameSettings: GameSettings;
  }): LeaderboardPositionals {
    // TODO: Position should be locked if the team was eliminated

    // team will not have a rank defined if they did not submit a score
    if (!args.targetEvent || !args.targetEvent.data || !args.targetEvent.data.data) {
      Log.warn("Unable to calculate team leaderboard positions because there are no score submitted events. This should never happen.");
      return undefined;
    }

    const currentPosition = LeaderboardBuilder.getTeamRankForTargetEvent({
      targetEvent: args.targetEvent,
      targetTeamId: args.targetTeamId,
      teamScoresSubmittedEvents: args.teamScoresSubmittedEvents,
      teamScoredLowestEvents: args.teamScoredLowestEvents,
      teams: args.teams,
      gameSettings: args.gameSettings
    });

    // find the event occurring one before the target event
    const prevEvent = args.teamScoresSubmittedEvents.filter(e => e.data.timeOfEvent <= args.targetEvent.data.timeOfEvent).slice(-1)[0];
    if (!prevEvent || !prevEvent.data || !prevEvent.data.data) {
      // since we don't know the previous position, the previous position and the change in position are both unknown and (therefore) undefined
      return { currentPosition };
    }

    const previousPosition = LeaderboardBuilder.getTeamRankForTargetEvent({
      targetEvent: prevEvent,
      targetTeamId: args.targetTeamId,
      teamScoresSubmittedEvents: args.teamScoresSubmittedEvents,
      teamScoredLowestEvents: args.teamScoredLowestEvents,
      teams: args.teams,
      gameSettings: args.gameSettings
    });

    return {
      currentPosition,
      previousPosition,
      change: previousPosition - currentPosition > 0 ? "gained" : previousPosition - currentPosition === 0 ? "same" : "lost"
    };
  }

  private static getTeamRankForTargetEvent(args: {
    targetTeamId: number;
    targetEvent: TeamScoresSubmittedGameEvent;
    teamScoresSubmittedEvents: TeamScoresSubmittedGameEvent[];
    teamScoredLowestEvents: TeamScoredLowestGameEvent[];
    teams: Team[];
    gameSettings: GameSettings;
  }): number {
    const teamScoredLowestEventsBeforeTargetEvent = args.teamScoredLowestEvents.filter(
      event => event.data.timeOfEvent <= args.targetEvent.data.timeOfEvent
    );
    const teamScoresSubmittedEventsBeforeTargetEvent = args.teamScoresSubmittedEvents.filter(
      event => event.data.timeOfEvent <= args.targetEvent.data.timeOfEvent
    );
    // Gather values required for determining team leaderboard positions.
    // Position determined in order of:
    // lives remaining > average "per virtual match" leaderboard position > total score (scores only added-to if not eliminated)
    const teamLives: TeamLivesMap = LeaderboardBuilder.calculateCurrentTeamLives(
      teamScoredLowestEventsBeforeTargetEvent,
      args.gameSettings.startingTeamLives
    );
    const teamRankAverages: TeamAverageRanksMap = LeaderboardBuilder.calculateCurrentTeamRankAverages(
      teamScoresSubmittedEventsBeforeTargetEvent,
      args.teams,
      teamLives
    );
    const teamScoresTotal: TeamScoresMap = LeaderboardBuilder.calculateTotalTeamScoresForEntireGame(
      teamScoresSubmittedEventsBeforeTargetEvent,
      args.teams,
      teamLives
    );
    const positionals = LeaderboardBuilder.determineTeamRanksForVirtualMatch({
      virtualMatch: args.targetEvent.data.eventMatch,
      teams: args.teams,
      teamLives: teamLives,
      teamRankAverages: teamRankAverages,
      teamScoreTotals: teamScoresTotal
    });
    const rank = positionals.get(args.targetTeamId).rank;
    return rank;
  }

  private static determineTeamRanksForVirtualMatch(args: {
    virtualMatch: VirtualMatch;
    teams: Team[];
    teamLives: TeamLivesMap;
    teamRankAverages: TeamAverageRanksMap;
    teamScoreTotals: TeamScoresMap;
  }): Map<TeamID, TeamScoreRankData> {
    const teamScores: CalculatedTeamScore[] = TeamScoreCalculator.calculateTeamScoresForVirtualMatch(args.virtualMatch, args.teams);

    const positionals = {
      eventMatch: args.virtualMatch,
      timeOfEvent: VirtualMatchCreator.getEstimatedTimeOfOccurrenceOfVirtualMatch(args.virtualMatch),
      data: new Map<TeamID, TeamScoreRankData>()
    };

    teamScores
      .sort((a, b) => b.score - a.score)
      .forEach((teamScore, i) => {
        // if teams scored the same score, they get the same rank.
        // e.g. T1: scored 100 (rank 0), T2: scored 100 (rank 0), T3: scored 99 (rank 2)
        const identicalScore = Array.from(positionals.data).find(d => d[1].score === teamScore.score);
        const rank = identicalScore ? identicalScore[1].rank : i;
        positionals.data.set(teamScore.teamId, { submitted: true, score: teamScore.score, rank });
      });

    args.teams.forEach(team => {
      const teamSubmittedScore = teamScores.find(teamScore => teamScore.teamId === team.id);
      // if a team has no defined score then the team did not submit a score
      if (!teamSubmittedScore) {
        // The rank of an unsubmitted score is the same as the "number of submitted scores"
        // (i.e. typically* one rank after the rank of the lowest submitted score [* if no tied scores]).
        // If multiple scores are unsubmitted, they will typically* share this rank.
        const rank = teamScores.length;
        positionals.data.set(team.id, { submitted: false, rank });
      }
    });

    return positionals.data;
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
   * Returns a map of team IDs mapped to their number of lives. One life is removed for each team in each event.
   */
  private static calculateCurrentTeamLives(events: TeamScoredLowestGameEvent[], startingTeamLives: number): TeamLivesMap {
    const teamLives: TeamLivesMap = new Map<TeamID, { lives: number; eliminatedInEvent?: TeamScoredLowestGameEvent }>();
    if (!events || !events.length) return teamLives;
    events.forEach(event => LeaderboardBuilder.updateTeamLivesForEvent(event, teamLives, startingTeamLives));
    return teamLives;
  }

  private static updateTeamLivesForEvent(
    event: TeamScoredLowestGameEvent,
    teamLives: Map<number, { lives: number; eliminatedInEvent?: TeamScoredLowestGameEvent }>,
    startingTeamLives: number
  ) {
    const teamId = event.data.teamId;
    const teamLivesValue = teamLives.get(teamId);
    const currentLives = teamLivesValue ? teamLivesValue.lives : startingTeamLives;
    const livesValue = currentLives - 1 < 0 ? 0 : currentLives - 1;
    if (livesValue === 0) {
      teamLives.set(teamId, { lives: livesValue, eliminatedInEvent: event });
    } else {
      teamLives.set(teamId, { lives: livesValue });
    }
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

  /**
   * Returns a map of team IDs mapped to the sum of all scores that each team has scored in the matches of the given game events.
   *
   * @private
   * @static
   * @param {TeamScoresSubmittedGameEvent[]} events Should be sorted in ascending order of when the event occurred.
   * @param {Team[]} teams
   * @returns {Map<TeamID, number>}
   */
  private static calculateTotalTeamScoresForEntireGame(
    events: TeamScoresSubmittedGameEvent[],
    teams: Team[],
    teamLives: TeamLivesMap
  ): TeamScoresMap {
    if (!events || !events.length) return;
    // Just using the TeamScoresSubmittedGameEvent here to avoid calculating the same match more than once.
    // This could really be any event, as long as that event occurs only once per virtual match.
    const teamScores = new Map<TeamID, { score: number }>();
    events.forEach(event => {
      event.data.eventMatch.matches.forEach(match => {
        for (const playerScore of match.playerScores) {
          const team = teams.find(team => team.teamOsuUsers.find(tou => tou.osuUser.osuUserId === playerScore.scoredBy.osuUserId));
          // Disregard a player's score if that player has not been added to any team for this game.
          if (!team) continue;
          // Do not add to the team's total score if the team has 0 lives remaining.
          // The team is eliminated, so they can no longer add to their total score by submitting a score.
          // This is necessary for accurately determining the team's leaderboard position (since the position sometimes relies on comparing team's total scores).
          const livesCheckEvent = teamLives.get(team.id);
          const teamScore = teamScores.get(team.id) || { score: 0 };
          if (livesCheckEvent && livesCheckEvent.eliminatedInEvent) {
            if (event.data.timeOfEvent >= livesCheckEvent.eliminatedInEvent.data.timeOfEvent) {
              // if this event occurred after the event in which the team was eliminated, do not add the player score to the team's total score
              teamScores.set(team.id, teamScore);
            } else {
              teamScores.set(team.id, { score: teamScore.score + playerScore.score });
            }
          }
        }
      });
    });
    return teamScores;
  }
}
