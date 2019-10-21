import { ReportableContext, ReportableContextType } from "../../domain/game/game-match-reported.entity";

export class LeaderboardBuilder {
  static buildLeaderboard(fromReportables: ReportableContext<ReportableContextType>[]): ReportableContext<"leaderboard"> {
    throw new Error("TODO: Implement method of LeaderboardBuilder.");
  }
}
