import { ReportableContext, ReportableContextType } from "../domain/game/game-match-reported.entity";

export class LeaderboardBuilder {
  /**
   * Builds the latest leaderboard from all the reportables of a game.
   *
   * @static
   * @param {ReportableContext<ReportableContextType>[]} fromReportables
   * @returns {ReportableContext<"leaderboard">}
   */
  static buildLeaderboard(fromReportables: ReportableContext<ReportableContextType>[]): ReportableContext<"leaderboard"> {
    //

    throw new Error("TODO: Implement method of LeaderboardBuilder.");
  }
}
