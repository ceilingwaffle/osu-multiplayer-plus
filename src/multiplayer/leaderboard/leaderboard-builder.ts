import { ReportableContext, ReportableContextType } from "../../domain/game/game-match-reported.entity";
import { Game } from "../../domain/game/game.entity";
import { IGameEvent } from "../game-events/interfaces/game-event-interface";
import { TeamScoredLowestGameEvent } from "../game-events/team-scored-lowest.game-event";
import { Leaderboard } from "../components/leaderboard";
import { LeaderboardLine, LeaderboardLinePlayer, LeaderboardLinePositionChange } from "../components/leaderboard-line";
import _ = require("lodash"); // do not convert to default import -- it will break!!
import { Log } from "../../utils/Log";
import { Team } from "../../domain/team/team.entity";
import { VirtualMatch } from "../virtual-match/virtual-match";
import { PlayerScore as PlayerScoreEntity } from "../../domain/score/player-score.entity";

/**
 * Key: teamID
 * Value: some corresponding team value (e.g. team score)
 * */
type TeamValue<T> = Map<number, T>;

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
  static buildLeaderboard(args: { game: Game; reportables: ReportableContext<ReportableContextType>[] }): ReportableContext<"leaderboard"> {
    const gameSettings: GameSettings = {
      countFailedScores: args.game.countFailedScores,
      startingTeamLives: args.game.teamLives
    };

    const eventReportables = args.reportables
      .filter(r => r.type === "game_event")
      .sort((a, b) => (a.item as IGameEvent).data.timeOfEvent - (b.item as IGameEvent).data.timeOfEvent);

    const events = eventReportables.map(reportable => reportable.item as IGameEvent);

    // team lives
    const teamLives: TeamValue<number> = new Map<number, number>();
    eventReportables.forEach(event => {
      if (event.type === "game_event" && event.subType === "team_scored_lowest") {
        LeaderboardBuilder.updateTeamLives(event, teamLives, gameSettings);
      }
    });

    // team scores
    const teamScoresTotal: TeamValue<number> = new Map<number, number>();
    eventReportables.forEach(event => {
      LeaderboardBuilder.updateTeamScores(event, args, teamScoresTotal);
    });
    const teamScoredLowestReportables = eventReportables.filter(r => r.subType === "team_scored_lowest");
    const lastReportable = teamScoredLowestReportables.slice(-1)[0];
    const teamScoresForLastEvent: TeamValue<number> = new Map<number, number>();
    const lastVirtualMatch = (lastReportable.item as TeamScoredLowestGameEvent).data.eventMatch;

    LeaderboardBuilder.updateTeamScores(lastReportable, args, teamScoresForLastEvent);

    const leaderboard: Leaderboard = {
      beatmapId: (lastReportable.item as TeamScoredLowestGameEvent).data.eventMatch.beatmapId,
      sameBeatmapNumber: (lastReportable.item as TeamScoredLowestGameEvent).data.eventMatch.sameBeatmapNumber,
      beatmapPlayed: {
        mapId: (lastReportable.item as TeamScoredLowestGameEvent).data.eventMatch.beatmapId,
        // TODO: Build beatmap from beatmapID
        mapUrl: null,
        mapString: null,
        stars: null
      },
      leaderboardLines: args.game.gameTeams.map<LeaderboardLine>(gt => {
        return {
          team: {
            teamName: gt.team.name,
            teamNumber: gt.teamNumber,
            players: gt.team.teamOsuUsers.map<LeaderboardLinePlayer>(tou => {
              const thisPlayerScores = lastVirtualMatch.matches.map(m =>
                m.playerScores.find(ps => ps.scoredBy.osuUserId === tou.osuUser.osuUserId)
              );
              const playerScore = thisPlayerScores.length && thisPlayerScores[0] ? thisPlayerScores[0] : null;
              const highestScoringTeamPlayerScores = LeaderboardBuilder.getHighestScoringPlayerScoresOfVirtualMatch(
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
          alive: LeaderboardBuilder.isTeamAlive(
            gameSettings.startingTeamLives,
            gt.team,
            events.filter(e => e.type === "team_scored_lowest").map(e => e as TeamScoredLowestGameEvent)
          ),
          position: LeaderboardBuilder.getTeamPositionals(gt.team.id, teamScoredLowestReportables, gameSettings, args),
          lives: {
            currentLives: teamLives.get(gt.team.id),
            startingLives: gameSettings.startingTeamLives
          },
          teamScore: {
            teamScore: teamScoresForLastEvent.get(gt.team.id)
          }
        };
      })
    };

    const final = {
      teamLives,
      teamScoresTotal,
      teamScoresForLastEvent
    };

    throw new Error("TODO: Implement method of LeaderboardBuilder.");
  }

  static getTeamPositionals(
    teamId: number,
    eventReportables: ReportableContext<ReportableContextType>[],
    gameSettings: GameSettings,
    args: { game: Game; reportables: ReportableContext<ReportableContextType>[] }
  ): {
    currentPosition: number;
    previousPosition?: number;
    change?: LeaderboardLinePositionChange;
  } {
    // determine team position on leaderboard from second-last event
    let prevTeamLives: TeamValue<number> = new Map<number, number>();
    const latestTeamLives: TeamValue<number> = new Map<number, number>();
    eventReportables
      .filter(event => event.type === "game_event" && event.subType === "team_scored_lowest")
      .forEach((event, index, all) => {
        LeaderboardBuilder.updateTeamLives(event, latestTeamLives, gameSettings);
        if (index === all.length - 2) {
          // clone a snapshot of the state of the team lives of the second-last event
          prevTeamLives = _(latestTeamLives).cloneDeep();
        }
      });

    let prevTeamScoresTotal: TeamValue<number> = new Map<number, number>();
    const latestTeamScoresTotal: TeamValue<number> = new Map<number, number>();
    eventReportables
      .filter(event => event.type === "game_event" && event.subType === "team_scored_lowest")
      .forEach((event, index, all) => {
        LeaderboardBuilder.updateTeamScores(event, args, latestTeamScoresTotal);
        if (index === all.length - 2) {
          // clone a snapshot of the state of the team lives of the second-last event
          prevTeamScoresTotal = _(latestTeamScoresTotal).cloneDeep();
        }
      });

    const prevPosition = LeaderboardBuilder.getCurrentLeaderboardPositionOfTeam(teamId, prevTeamLives, prevTeamScoresTotal);

    if (!prevPosition) {
      return {
        currentPosition: latestTeamLives.get(teamId)
      };
    }

    const latestPosition = LeaderboardBuilder.getCurrentLeaderboardPositionOfTeam(teamId, latestTeamLives, latestTeamScoresTotal);

    return {
      currentPosition: latestPosition,
      previousPosition: prevPosition,
      change: prevPosition - latestPosition > 0 ? "gained" : prevPosition - latestPosition === 0 ? "same" : "lost"
    };
  }

  static getCurrentLeaderboardPositionOfTeam(
    teamId: number,
    allTeamLives: Map<number, number>,
    allTeamScoresTotal: Map<number, number>
  ): number | undefined {
    // position is determined by number of lives remaining.
    // if same number of lives remaining, fallback to total team score

    const positionsBestToWorst = new Map<number, { position?: number; lives?: number; totalScore?: number }>();

    allTeamLives.forEach((teamLives, teamId, _allTeamLives) => {
      const found = positionsBestToWorst.get(teamId);
      if (!found) positionsBestToWorst.set(teamId, { lives: teamLives });
      else found.lives = teamLives;
    });
    allTeamScoresTotal.forEach((teamTotalScore, teamId, _allTeamScoresTotal) => {
      const found = positionsBestToWorst.get(teamId);
      if (!found) positionsBestToWorst.set(teamId, { totalScore: teamTotalScore });
      else found.totalScore = teamTotalScore;
    });

    const positionsBestToWorstArray = Array.from(positionsBestToWorst).sort((a, b) => {
      // sort by scores highest to lowest
      if (b[1] && b[1].lives && a[1] && a[1].lives) {
        const livesDiff = b[1].lives - a[1].lives;
        if (livesDiff !== 0) return livesDiff;
      }
      if (b[1] && b[1].totalScore && a[1] && a[1].totalScore) {
        const scoresDiff = b[1].totalScore - a[1].totalScore;
        return scoresDiff;
      }
      return 0;
      // TODO - improve this. Not perfect, since teams may (very rarely) have identical total scores.
    });

    positionsBestToWorstArray.forEach((position, index) => (position[1].position = index + 1));

    const teamPosition = positionsBestToWorstArray.find(position => teamId === position[0]);
    if (!teamPosition || !teamPosition[1] || teamPosition[1].position < 1) {
      return undefined;
    }

    return teamPosition[1].position;
  }

  static isTeamAlive(startingTeamLives: number, team: Team, events: TeamScoredLowestGameEvent[]): boolean {
    const teamLosingEvents = events.filter(event => event.type === "team_scored_lowest" && event.data.teamId === team.id);
    if (!teamLosingEvents.length) {
      // team is alive if no losing events occurred for this team
      return true;
    }

    const teamLostCount = teamLosingEvents.length;

    // team is NOT alive if they lost more times than
    return teamLostCount >= startingTeamLives;
  }

  static getHighestScoringPlayerScoresOfVirtualMatch(team: Team, virtualMatch: VirtualMatch): PlayerScoreEntity[] {
    const teamPlayerScoresLowestToHighest = _(virtualMatch.matches)
      .map(m => m.playerScores)
      .flattenDeep()
      .filter(playerScore => !!team.teamOsuUsers.find(tou => tou.osuUser.osuUserId === playerScore.scoredBy.osuUserId))
      // .flattenDeep()
      .sort((a, b) => a.score - b.score)
      .value();

    if (!teamPlayerScoresLowestToHighest || !teamPlayerScoresLowestToHighest.length) {
      Log.warn("No highest score could be determined for team. This should never happen.");
      return null;
    }
    // check for tied scores
    const highestOrTiedScorePlayerScore = teamPlayerScoresLowestToHighest.slice(-1)[0];
    if (!highestOrTiedScorePlayerScore) {
      Log.warn("No highest score could be determined for team... This should never happen.");
      return null;
    }
    const highestScore = highestOrTiedScorePlayerScore.score;
    const highestScoringTeamPlayerScores = teamPlayerScoresLowestToHighest.filter(sps => sps.score === highestScore);
    return highestScoringTeamPlayerScores;
  }

  private static updateTeamScores(
    event: ReportableContext<ReportableContextType>,
    args: { game: Game; reportables: ReportableContext<ReportableContextType>[] },
    teamScores: Map<number, number>
  ) {
    if (!event || !event.item) {
      return;
    }
    // Just using the team_scored_lowest event here to avoid calculating the same match more than once.
    // This could really be any event, as long as that event occurs only once per virtual match.
    if (event.subType === "team_scored_lowest") {
      (event.item as TeamScoredLowestGameEvent).data.eventMatch.matches.forEach(match => {
        for (const playerScore of match.playerScores) {
          const gameTeam = args.game.gameTeams.find(gameTeam =>
            gameTeam.team.teamOsuUsers.find(tou => tou.osuUser.osuUserId === playerScore.scoredBy.osuUserId)
          );
          if (!gameTeam) {
            // Disregard a player's score if that player has not been added to any team for this game.
            continue;
          }
          const teamId = gameTeam.team.id;
          const teamScore = teamScores.get(teamId) || 0;
          teamScores.set(teamId, teamScore + playerScore.score);
        }
      });
    }
  }

  private static updateTeamLives(
    event: ReportableContext<ReportableContextType>,
    teamLives: Map<number, number>,
    gameSettings: { countFailedScores: boolean; startingTeamLives: number }
  ) {
    const teamId = (event.item as TeamScoredLowestGameEvent).data.teamId;
    const currentLives = teamLives.get(teamId) || gameSettings.startingTeamLives;
    teamLives.set(teamId, currentLives - 1 < 0 ? 0 : currentLives - 1);
  }
}
