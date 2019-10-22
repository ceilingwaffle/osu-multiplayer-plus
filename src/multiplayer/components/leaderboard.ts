import { VirtualMatchKey } from "../virtual-match-key";
import { LeaderboardLine } from "./leaderboard-line";
import { Match } from "./match";
import { Lobby } from "./lobby";
import { Beatmap } from "./beatmap";

/** Leaderboard utilises a VirtualMatchKey to denote the latest VM this leaderboard was built for. */
export interface Leaderboard extends VirtualMatchKey {
  beatmapsRemaining?: number;
  beatmapPlayed: Beatmap;
  lobby: Lobby;
  match: Match;
  leaderboardLines: LeaderboardLine[];
}
