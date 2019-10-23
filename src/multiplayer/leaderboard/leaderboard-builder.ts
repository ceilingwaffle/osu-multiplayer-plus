import { ReportableContext, ReportableContextType } from "../../domain/game/game-match-reported.entity";
import { Game } from "../../domain/game/game.entity";
import { IGameEvent } from "../game-events/interfaces/game-event-interface";
import { TeamScoredLowestGameEvent } from "../game-events/team-scored-lowest.game-event";
import { Leaderboard } from "../components/leaderboard";

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

    const events = args.reportables
      .filter(r => r.type === "game_event")
      .sort((a, b) => (a.item as IGameEvent).data.timeOfEvent - (b.item as IGameEvent).data.timeOfEvent);

    // team lives
    const teamLives: TeamValue<number> = new Map<number, number>();
    events.forEach(event => {
      if (event.type === "game_event" && event.subType === "team_scored_lowest") {
        LeaderboardBuilder.updateTeamLives(event, teamLives, gameSettings);
      }
    });

    // team scores
    const teamScoresTotal: TeamValue<number> = new Map<number, number>();
    events.forEach(event => {
      LeaderboardBuilder.updateTeamScores(event, args, teamScoresTotal);
    });
    const lastEvent = events.filter(r => r.subType === "team_scored_lowest").slice(-1)[0];
    const teamScoresForLastEvent: TeamValue<number> = new Map<number, number>();
    LeaderboardBuilder.updateTeamScores(lastEvent, args, teamScoresForLastEvent);

    const leaderboard: Leaderboard = {
      beatmapPlayed: null,
      beatmapId: null,
      sameBeatmapNumber: null,
      leaderboardLines: []
    };

    const final = {
      teamLives,
      teamScoresTotal,
      teamScoresForLastEvent
    };

    throw new Error("TODO: Implement method of LeaderboardBuilder.");
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
