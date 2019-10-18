import { Lobby } from "../components/lobby";
import { Match } from "../components/match";
import { LeaderboardLine } from "../components/leaderboard-line";

export class GameReport {
  lobby: Lobby;
  matches: Match[];
  leaderboardLines: LeaderboardLine[];
}
