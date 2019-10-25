import { ReportableContext, ReportableContextType } from "../../domain/game/game-match-reported.entity";
import { Game } from "../../domain/game/game.entity";
import { IGameEvent } from "../game-events/interfaces/game-event-interface";
import { TeamScoredLowestGameEvent } from "../game-events/team-scored-lowest.game-event";
import { Leaderboard } from "../components/leaderboard";
import { LeaderboardLine, LeaderboardLinePlayer } from "../components/leaderboard-line";
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

export class LeaderboardBuilder {
  /**
   * Builds the latest leaderboard from all the reportables of a game.
   *
   * @static
   * @param {{ game: Game; reportables: ReportableContext<ReportableContextType>[] }} args
   * @returns {ReportableContext<"leaderboard">}
   */
  static buildLeaderboard(args: { game: Game; reportables: ReportableContext<ReportableContextType>[] }): ReportableContext<"leaderboard"> {
    const gameSettings = {
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
    const lastEvent = eventReportables.filter(r => r.subType === "team_scored_lowest").slice(-1)[0];
    const teamScoresForLastEvent: TeamValue<number> = new Map<number, number>();
    LeaderboardBuilder.updateTeamScores(lastEvent, args, teamScoresForLastEvent);

    const lastVirtualMatch = (lastEvent.item as TeamScoredLowestGameEvent).data.eventMatch;

    const leaderboard: Leaderboard = {
      beatmapId: (lastEvent.item as TeamScoredLowestGameEvent).data.eventMatch.beatmapId,
      sameBeatmapNumber: (lastEvent.item as TeamScoredLowestGameEvent).data.eventMatch.sameBeatmapNumber,
      beatmapPlayed: {
        mapId: (lastEvent.item as TeamScoredLowestGameEvent).data.eventMatch.beatmapId,
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
                scoreSubmitted: !!playerScore.score,
                score: {
                  score: playerScore.score || 0,
                  scoreLetterGrade: playerScore.scoreLetterGrade,
                  accuracy: playerScore.accuracy,
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
          position: {
            currentPosition: 1, // TODO
            previousPosition: 1, // TODO
            gainedPosition: false, // TODO
            lostPosition: false, // TODO
            samePosition: true // TODO
          },
          lives: {
            currentLives: 1, // TODO
            startingLives: 1 // TODO
          },
          teamScore: {
            teamScore: 1, // TODO
            tiedWithTeamNumbers: [] // TODO
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
      .map(ps => {
        const teamOsuUser = team.teamOsuUsers.find(tou2 => {
          tou2.osuUser.osuUserId === ps.scoredBy.osuUserId;
        });
        if (teamOsuUser) return ps;
      })
      .flattenDeep()
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
    (event.item as TeamScoredLowestGameEvent).data.eventMatch.matches.forEach(match => {
      match.playerScores.forEach(playerScore => {
        const gameTeam = args.game.gameTeams.find(gameTeam =>
          gameTeam.team.teamOsuUsers.find(tou => tou.osuUser.osuUserId === playerScore.scoredBy.osuUserId)
        );
        const teamId = gameTeam.team.id;
        const teamScore = teamScores.get(teamId) || 0;
        teamScores.set(teamId, teamScore + playerScore.score);
      });
    });
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
