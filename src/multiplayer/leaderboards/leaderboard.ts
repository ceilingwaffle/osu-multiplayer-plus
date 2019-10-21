import { VirtualMatchKey } from "../virtual-match-key";
import { LeaderboardLine } from "./leaderboard-line";
import { Match } from "../components/match";
import { Lobby } from "../components/lobby";
import { Beatmap } from "../components/beatmap";

/** Leaderboard utilises a VirtualMatchKey to denote the latest VM this leaderboard was built for. */
export interface Leaderboard extends VirtualMatchKey {
  beatmapsRemaining?: number;
  beatmapPlayed: Beatmap;
  lobby: Lobby;
  match: Match;
  leaderboardLines: LeaderboardLine[];
}
