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
import { VirtualMatchReportData } from "../virtual-match/virtual-match-report-data";
import { GameEventType } from "../game-events/types/game-event-types";
import { IGameEvent } from "../game-events/interfaces/game-event-interface";

type GameSettings = { countFailedScores: boolean; startingTeamLives: number };
type TeamLivesMapValue = { lives: number; lostLifeInEvents: TeamScoredLowestGameEvent[]; eliminatedInEvent?: TeamScoredLowestGameEvent };
type TeamLivesMap = Map<TeamID, TeamLivesMapValue>;
type TeamAverageRanksMapValue = { virtualMatchAverageRank: number };
type TeamAverageRanksMap = Map<TeamID, TeamAverageRanksMapValue>;
type TeamScoresMapValue = { score: number };
type TeamScoresMap = Map<TeamID, TeamScoresMapValue>;
type TeamScoreRankData = { submitted: boolean; score?: number; rank: number };

export class LeaderboardBuilder {
  static buildLeaderboardVirtualMatchGroups(args: {
    game: Game;
    virtualMatchReportGroups: VirtualMatchReportData[];
  }): VirtualMatchReportData[] {
    const { gameSettings, teams, teamScoredLowestEvents, teamScoresSubmittedEvents } = LeaderboardBuilder.gatherPreLeaderboardParts(args);

    const leaderboardVMGroups: VirtualMatchReportData[] = [];
    if (!LeaderboardBuilder.isValidPreLeaderboardParts({ gameSettings, teams, teamScoredLowestEvents, teamScoresSubmittedEvents })) {
      return leaderboardVMGroups;
    }

    let lastVirtualMatch: VirtualMatch;

    teamScoresSubmittedEvents.forEach(tssEvent => {
      const targetEvent = tssEvent;
      lastVirtualMatch = targetEvent.data.eventMatch;
      const teamScoredLowestEventsBeforeTargetEvent = teamScoredLowestEvents.filter(event => event.data.timeOfEvent <= targetEvent.data.timeOfEvent); //prettier-ignore
      const teamScoresSubmittedEventsBeforeTargetEvent = teamScoresSubmittedEvents.filter(event => event.data.timeOfEvent <= targetEvent.data.timeOfEvent); //prettier-ignore

      const tssEventVirtualMatch = targetEvent.data.eventMatch;
      const teamScoresForLastVirtualMatch = TeamScoreCalculator.calculateTeamScoresForVirtualMatch(tssEventVirtualMatch, teams);
      const teamLives: TeamLivesMap = LeaderboardBuilder.calculateFromEvents_LatestTeamLives(
        teams,
        teamScoredLowestEventsBeforeTargetEvent,
        gameSettings.startingTeamLives
      );

      const leaderboard: Leaderboard = LeaderboardBuilder.buildLeaderboard(
        targetEvent,
        lastVirtualMatch,
        args,
        teamScoresForLastVirtualMatch,
        teamScoresSubmittedEventsBeforeTargetEvent,
        teamScoredLowestEventsBeforeTargetEvent,
        teams,
        gameSettings,
        teamLives
      );

      leaderboardVMGroups.push({
        beatmapId: lastVirtualMatch.beatmapId,
        sameBeatmapNumber: lastVirtualMatch.sameBeatmapNumber,
        leaderboard: leaderboard
      });
    });

    if (!lastVirtualMatch) return [];
    if (!leaderboardVMGroups || !leaderboardVMGroups.length) return [];

    return leaderboardVMGroups;
  }

  private static isValidPreLeaderboardParts(args: {
    gameSettings: GameSettings;
    teams: Team[];
    teamScoredLowestEvents: TeamScoredLowestGameEvent[];
    teamScoresSubmittedEvents: TeamScoresSubmittedGameEvent[];
  }): boolean {
    if (!args.teams.length) {
      Log.warn("Cannot build leaderboard because game has no teams.");
      return false;
    }
    if (!args.teamScoredLowestEvents.length) {
      Log.warn(`Cannot build leaderboard because there were no ${TeamScoredLowestGameEvent.constructor.name} events to process.`);
      return false;
    }
    if (!args.teamScoresSubmittedEvents.length) {
      Log.warn(`Cannot build leaderboard because there were no ${TeamScoresSubmittedGameEvent.constructor.name} events to process.`);
      return false;
    }
    return true;
  }

  /**
   * Builds the latest leaderboard from virtual match reportable items such as game events and messages.
   *
   * @static
   * @param {{ game: Game; virtualMatchReportGroups: VirtualMatchReportData[] }} args
   * @returns {VirtualMatchReportData}
   */
  static buildLatestLeaderboardVirtualMatchGroup(args: {
    game: Game;
    virtualMatchReportGroups: VirtualMatchReportData[];
  }): VirtualMatchReportData {
    const { gameSettings, teams, teamScoredLowestEvents, teamScoresSubmittedEvents } = LeaderboardBuilder.gatherPreLeaderboardParts(args);

    if (!LeaderboardBuilder.isValidPreLeaderboardParts({ gameSettings, teams, teamScoredLowestEvents, teamScoresSubmittedEvents })) {
      return undefined;
    }

    const lastTeamScoreSubmittedEvent = teamScoresSubmittedEvents.slice(-1)[0];
    const lastVirtualMatch = lastTeamScoreSubmittedEvent.data.eventMatch;
    const teamScoresForLastVirtualMatch = TeamScoreCalculator.calculateTeamScoresForVirtualMatch(lastVirtualMatch, teams);
    const teamLives: TeamLivesMap = LeaderboardBuilder.calculateFromEvents_LatestTeamLives(
      teams,
      teamScoredLowestEvents,
      gameSettings.startingTeamLives
    );

    const leaderboard: Leaderboard = LeaderboardBuilder.buildLeaderboard(
      lastTeamScoreSubmittedEvent,
      lastVirtualMatch,
      args,
      teamScoresForLastVirtualMatch,
      teamScoresSubmittedEvents,
      teamScoredLowestEvents,
      teams,
      gameSettings,
      teamLives
    );

    return {
      beatmapId: lastVirtualMatch.beatmapId,
      sameBeatmapNumber: lastVirtualMatch.sameBeatmapNumber,
      leaderboard: leaderboard
    };
  }

  private static gatherPreLeaderboardParts(args: { game: Game; virtualMatchReportGroups: VirtualMatchReportData[] }) {
    const gameSettings: GameSettings = {
      countFailedScores: args.game.countFailedScores,
      startingTeamLives: args.game.teamLives
    };

    const teams = args.game.gameTeams.map(gameTeam => gameTeam.team);
    const teamScoredLowestEvents = LeaderboardBuilder.extractEventsOfTypeFromVirtualMatchReportGroups<TeamScoredLowestGameEvent>(
      args.virtualMatchReportGroups,
      "team_scored_lowest"
    );
    const teamScoresSubmittedEvents = LeaderboardBuilder.extractEventsOfTypeFromVirtualMatchReportGroups<TeamScoresSubmittedGameEvent>(
      args.virtualMatchReportGroups,
      "team_scores_submitted"
    );
    return {
      gameSettings,
      teams,
      teamScoredLowestEvents,
      teamScoresSubmittedEvents
    };
  }

  private static buildLeaderboard(
    lastTeamScoreSubmittedEvent: TeamScoresSubmittedGameEvent,
    lastVirtualMatch: VirtualMatch,
    args: { game: Game; virtualMatchReportGroups: VirtualMatchReportData[] },
    teamScoresForLastVirtualMatch: CalculatedTeamScore[],
    teamScoresSubmittedEvents: TeamScoresSubmittedGameEvent[],
    teamScoredLowestEvents: TeamScoredLowestGameEvent[],
    teams: Team[],
    gameSettings: GameSettings,
    teamLives: Map<number, TeamLivesMapValue>
  ): Leaderboard {
    return {
      leaderboardEventTime: lastTeamScoreSubmittedEvent.data.timeOfEvent, // this could be a string if time was derived from the match endTime/startTime
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
  }

  private static extractEventsOfTypeFromVirtualMatchReportGroups<T extends IGameEvent>(
    virtualMatchReportGroups: VirtualMatchReportData[],
    eventType: GameEventType
  ): T[] {
    // TODO: Derive GameEventType from T. We should not need to provide GameEventType in the args.
    //        Maybe create a map in another class mapping the type to the GameEvent class?
    return _(virtualMatchReportGroups)
      .map(vmrg => vmrg.events)
      .flatten()
      .value()
      .filter(event => event && event.type === eventType)
      .map(event => event as T)
      .sort((a, b) => a.data.timeOfEvent - b.data.timeOfEvent);
  }

  /**
   * Returns average "per virtual match" leaderboard position at the time of the last of the given events.
   *
   * Note that this is NOT the average leaderboard position rank.
   * This is more like the equivalent of the average of where the team was positioned on the multiplayer results screen.
   *
   * A team could technically keep scoring after they are eliminated.
   * We account for this later by "locking" their average rank to whatever it was when the team was eliminated.
   * The elimination event is included in the average calculation (it's the last event to be included in the calculation for the team).
   *
   * @static
   * @param {Team[]} teams
   * @param {TeamScoresSubmittedGameEvent[]} teamScoresSubmittedEvents
   * @param {Map<number, TeamLivesMap>} teamLivesMap
   * @returns {Map<number, TeamAverageRanksMap>}
   */
  private static calculateFromEvents_LatestTeamRankAverages(
    teams: Team[],
    teamScoresSubmittedEvents: TeamScoresSubmittedGameEvent[], // contains the team scores for each VM
    teamLivesMap: TeamLivesMap // we use these to check if/which event the team was eliminated in
  ): TeamAverageRanksMap {
    const teamRankAverages = new Map<TeamID, { virtualMatchAverageRank: number }>();
    const teamRankTally = new Map<TeamID, { ranksSum: number; ranksCount: number }>();
    teams.forEach(team => {
      teamRankTally.set(team.id, { ranksSum: 0, ranksCount: 0 });
      teamRankAverages.set(team.id, { virtualMatchAverageRank: 0 });
    });

    // tally the team ranks for each score-submitted event
    teamScoresSubmittedEvents.forEach(tssEvent => {
      const virtualMatchTeamRanks = LeaderboardBuilder.rankTeamsByScoreForVirtualMatch({
        virtualMatch: tssEvent.data.eventMatch,
        teams: teams
      });
      Array.from(virtualMatchTeamRanks).forEach(virtualMatchTeamRank => {
        const teamId = virtualMatchTeamRank[0];
        if (!virtualMatchTeamRanks.get(teamId)) return;

        // Don't add to the team's tally if the team was eliminated strictly-before this event,
        // but do add to the team's tally if this is the event in which the team was eliminated.
        const lives = teamLivesMap.get(teamId);
        if (
          lives &&
          lives.eliminatedInEvent &&
          lives.eliminatedInEvent.data &&
          lives.eliminatedInEvent.data.timeOfEvent < tssEvent.data.timeOfEvent
        ) {
          return;
        }

        // add to the team's tally
        teamRankTally.get(teamId).ranksSum += virtualMatchTeamRanks.get(teamId).rank;
        teamRankTally.get(teamId).ranksCount++;
      });
    });

    // set average team rank
    teams.forEach(team => {
      const tallyTarget = teamRankTally.get(team.id);
      teamRankAverages.set(team.id, {
        virtualMatchAverageRank: tallyTarget.ranksSum / tallyTarget.ranksCount
      });
    });

    return teamRankAverages;
  }

  /**
   * Returns the leaderboard "positionals" (current and previous leaderboard positions) of teams for the target event.
   *
   * @private
   * @static
   * @param {{
   *     targetTeamId: TeamID; // get the positionals for this team ID
   *     targetEvent: TeamScoresSubmittedGameEvent; // get the positions at the time of this event
   *     teamScoresSubmittedEvents: TeamScoresSubmittedGameEvent[]; // all the game events thus far (must include the targetEvent)
   *     teamScoredLowestEvents: TeamScoredLowestGameEvent[];
   *     teams: Team[]; // all the teams added to the game
   *     gameSettings: GameSettings;
   *   }} args
   * @returns {LeaderboardPositionals}
   */
  private static getTeamPositionals(args: {
    targetTeamId: TeamID; // get the positionals for this team ID
    targetEvent: TeamScoresSubmittedGameEvent; // get the positions at the time of this event
    teamScoresSubmittedEvents: TeamScoresSubmittedGameEvent[]; // all the game events thus far (must include the targetEvent)
    teamScoredLowestEvents: TeamScoredLowestGameEvent[];
    teams: Team[]; // all the teams added to the game
    gameSettings: GameSettings;
  }): LeaderboardPositionals {
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

    // Find the event occurring one before the target event.
    const prevEvent = args.teamScoresSubmittedEvents
      .filter(
        e =>
          e.data.timeOfEvent <= args.targetEvent.data.timeOfEvent &&
          !VirtualMatchCreator.isEquivalentVirtualMatchByKey(e.data.eventMatch, args.targetEvent.data.eventMatch)
      )
      .slice(-1)[0];
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

  /**
   * Returns the leaderboard rank for teams of the target event.
   *
   * @private
   * @static
   * @param {{
   *     targetTeamId: number;
   *     targetEvent: TeamScoresSubmittedGameEvent;
   *     teamScoresSubmittedEvents: TeamScoresSubmittedGameEvent[];
   *     teamScoredLowestEvents: TeamScoredLowestGameEvent[];
   *     teams: Team[];
   *     gameSettings: GameSettings;
   *   }} args
   * @returns {number}
   */
  private static getTeamRankForTargetEvent(args: {
    targetTeamId: number;
    targetEvent: TeamScoresSubmittedGameEvent;
    teamScoresSubmittedEvents: TeamScoresSubmittedGameEvent[];
    teamScoredLowestEvents: TeamScoredLowestGameEvent[];
    teams: Team[];
    gameSettings: GameSettings;
  }): number {
    const positionals = {
      eventMatch: args.targetEvent.data.eventMatch,
      timeOfEvent: VirtualMatchCreator.getEstimatedTimeOfOccurrenceOfVirtualMatch(args.targetEvent.data.eventMatch),
      data: new Map<TeamID, TeamScoreRankData>()
    };

    const teamScoredLowestEventsBeforeTargetEvent = args.teamScoredLowestEvents.filter(event => event.data.timeOfEvent <= args.targetEvent.data.timeOfEvent); //prettier-ignore
    const teamScoresSubmittedEventsBeforeTargetEvent = args.teamScoresSubmittedEvents.filter(event => event.data.timeOfEvent <= args.targetEvent.data.timeOfEvent); //prettier-ignore

    // initialize maps
    let teamLives: TeamLivesMap = new Map<TeamID, { lives: number; lostLifeInEvents: TeamScoredLowestGameEvent[] }>();
    let teamScoresTotal: TeamScoresMap = new Map<TeamID, { score: number }>();
    let teamRankAverages: TeamAverageRanksMap = new Map<TeamID, { virtualMatchAverageRank: number }>();
    args.teams.forEach(team => {
      teamLives.set(team.id, { lives: args.gameSettings.startingTeamLives, lostLifeInEvents: [] });
      teamScoresTotal.set(team.id, { score: 0 });
      teamRankAverages.set(team.id, { virtualMatchAverageRank: 0 });
    });

    // Gather values required for determining team leaderboard positions.
    // Position determined in order of:
    // lives remaining > average "per virtual match" leaderboard position > total score (scores only added-to if not eliminated)
    teamScoresSubmittedEventsBeforeTargetEvent.forEach(tssEvent => {
      // find the equivalent lowest-score event for this score-submitted event
      const tslEvent = teamScoredLowestEventsBeforeTargetEvent.find(
        tslEvent =>
          tslEvent.data.eventMatch.beatmapId === tssEvent.data.eventMatch.beatmapId &&
          tslEvent.data.eventMatch.sameBeatmapNumber === tssEvent.data.eventMatch.sameBeatmapNumber
      );

      // re-use the previous team lives if there was no equivalent "lowest score" (life-losing) event for this score event
      if (tslEvent) {
        teamLives = LeaderboardBuilder.calculateFromEvents_LatestTeamLives(
          args.teams,
          teamScoredLowestEventsBeforeTargetEvent,
          args.gameSettings.startingTeamLives
        );
      }

      teamScoresTotal = LeaderboardBuilder.calculateFromEvents_LatestTotalTeamScores(
        teamScoresSubmittedEventsBeforeTargetEvent,
        args.teams,
        teamLives
      );

      teamRankAverages = LeaderboardBuilder.calculateFromEvents_LatestTeamRankAverages(
        args.teams,
        teamScoresSubmittedEventsBeforeTargetEvent,
        teamLives
      );

      // all values should now be gathered to determine the positions

      // sort in order of priority of values (rank 0 [best] first, rank n [worst] last)
      const teamsSortedByRank = args.teams
        .map<TeamID>(team => team.id)
        .map<{
          teamId: TeamID;
          lives: TeamLivesMapValue;
          rankAverage: TeamAverageRanksMapValue;
          scoreTotal: TeamScoresMapValue;
          tiedRankWithTeamIds: number[];
        }>(teamId => ({
          teamId: teamId,
          lives: teamLives.get(teamId),
          rankAverage: teamRankAverages.get(teamId),
          scoreTotal: teamScoresTotal.get(teamId),
          tiedRankWithTeamIds: []
        }))
        .sort((a, b) => {
          if (b.lives.lives !== a.lives.lives) {
            // The team with more lives remaining gets bumped up.
            return b.lives.lives - a.lives.lives;
          }
          if (a.lives.eliminatedInEvent && b.lives.eliminatedInEvent) {
            // Both teams were eliminated.
            // The team that was eliminated earlier gets bumped up.
            return b.lives.eliminatedInEvent.data.timeOfEvent - a.lives.eliminatedInEvent.data.timeOfEvent;
          }
          if (b.rankAverage.virtualMatchAverageRank !== a.rankAverage.virtualMatchAverageRank) {
            // The lower (better) average rank gets bumped up.
            return a.rankAverage.virtualMatchAverageRank - b.rankAverage.virtualMatchAverageRank;
          }
          if (b.scoreTotal.score !== a.scoreTotal.score) {
            // The higher (better) total score gets bumped up.
            return b.scoreTotal.score - a.scoreTotal.score;
          }

          a.tiedRankWithTeamIds.push(a.teamId, b.teamId);
          b.tiedRankWithTeamIds.push(a.teamId, b.teamId);
          return 0;
        });

      // rank is determined by the order of these sorted teams
      teamsSortedByRank.forEach((a, index, all) => {
        let rank = index;
        if (a.tiedRankWithTeamIds.length) {
          // Find the index of the first team with a tied rank.
          // The idea here is that all tied-rank teams should have the same rank as the index of the first tied-rank team.
          rank = all.findIndex(b => a.tiedRankWithTeamIds.includes(b.teamId));
          if (rank == -1) throw new Error("Bad rank calc when all ranking criteria was tied between some teams. This should never happen.");
        }

        positionals.data.set(a.teamId, { submitted: true, rank });
      });
    });

    const rank = positionals.data.get(args.targetTeamId).rank;
    return rank;
  }

  /**
   * Returns the virtual match rank determined simply by highest score.
   *
   * @private
   * @static
   * @param {{ virtualMatch: VirtualMatch; teams: Team[] }} args
   * @returns {Map<TeamID, TeamScoreRankData>}
   */
  private static rankTeamsByScoreForVirtualMatch(args: { virtualMatch: VirtualMatch; teams: Team[] }): Map<TeamID, TeamScoreRankData> {
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
   *
   * @private
   * @static
   * @param {Team[]} teams
   * @param {TeamScoredLowestGameEvent[]} events
   * @param {number} startingTeamLives
   * @returns {TeamLivesMap}
   */
  private static calculateFromEvents_LatestTeamLives(
    teams: Team[],
    events: TeamScoredLowestGameEvent[],
    startingTeamLives: number
  ): TeamLivesMap {
    const teamLives: TeamLivesMap = new Map<
      TeamID,
      { lives: number; eliminatedInEvent?: TeamScoredLowestGameEvent; lostLifeInEvents: [] }
    >();
    // each team starts with the starting number of lives
    teams.forEach(team => teamLives.set(team.id, { lives: startingTeamLives, lostLifeInEvents: [] }));
    if (!events || !events.length) return teamLives;
    events.forEach(event => LeaderboardBuilder.updateTeamLivesForEvent(event, teamLives, startingTeamLives));
    return teamLives;
  }

  /**
   * Subtracts one life for the given event.
   *
   * @private
   * @static
   * @param {TeamScoredLowestGameEvent} event
   * @param {TeamLivesMap} allTeamLivesMap Must be initialized already with teams referenced in the given event
   * @param {number} startingTeamLives
   * @returns {void}
   */
  private static updateTeamLivesForEvent(event: TeamScoredLowestGameEvent, allTeamLivesMap: TeamLivesMap, startingTeamLives: number): void {
    const teamId = event.data.teamId;
    let eventTeamLives = allTeamLivesMap.get(teamId);
    if (!eventTeamLives) throw new Error("Team targetted in event was not initialized in the team lives map.");
    const newLivesNumber = eventTeamLives.lives - 1 < 0 ? 0 : eventTeamLives.lives - 1;
    if (newLivesNumber < eventTeamLives.lives) {
      eventTeamLives.lostLifeInEvents.push(event);
      allTeamLivesMap.set(teamId, { lives: newLivesNumber, lostLifeInEvents: eventTeamLives.lostLifeInEvents });
      eventTeamLives = allTeamLivesMap.get(teamId);
    }
    if (newLivesNumber === 0) {
      allTeamLivesMap.set(teamId, { lives: newLivesNumber, lostLifeInEvents: eventTeamLives.lostLifeInEvents, eliminatedInEvent: event });
      return;
    }
    allTeamLivesMap.set(teamId, { lives: newLivesNumber, lostLifeInEvents: eventTeamLives.lostLifeInEvents });
  }

  /**
   * Returns a map of team IDs mapped to the sum of all scores that each team has scored in the matches of the given game events.
   *
   * @private
   * @static
   * @param {TeamScoresSubmittedGameEvent[]} events Should be sorted in ascending order of when the event occurred.
   * @param {Team[]} teams
   * @returns {Map<TeamID, number>}
   */
  private static calculateFromEvents_LatestTotalTeamScores(
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
          teamScores.set(team.id, { score: teamScore.score + playerScore.score });
          if (
            livesCheckEvent &&
            livesCheckEvent.eliminatedInEvent &&
            event.data.timeOfEvent > livesCheckEvent.eliminatedInEvent.data.timeOfEvent
          ) {
            // If this event occurred strictly-after the event in which the team was eliminated, do not add the player score to the team's total score.
            // We still add the player scores to the team's total score if this is the event in which the team was eliminated (this will be the final event in which a score is added).
            teamScores.set(team.id, teamScore);
          }
        }
      });
    });
    return teamScores;
  }
}
