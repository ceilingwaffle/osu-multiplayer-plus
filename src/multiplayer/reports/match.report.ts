import { Lobby } from "../components/lobby";
import { Match } from "../components/match";
import { LeaderboardLine } from "../components/leaderboard-line";

export class MatchReport {
  lobby: Lobby;
  match: Match;
  leaderboardLines: LeaderboardLine[];
}
