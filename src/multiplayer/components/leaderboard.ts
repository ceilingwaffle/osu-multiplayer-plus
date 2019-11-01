import { VirtualMatchKey } from "../virtual-match/virtual-match-key";
import { LeaderboardLine } from "./leaderboard-line";
import { Beatmap } from "./beatmap";

/** Leaderboard utilises a VirtualMatchKey to denote the latest VM this leaderboard was built for. */
export interface Leaderboard extends VirtualMatchKey {
  beatmapsRemaining?: number;
  beatmapPlayed: Beatmap;
  leaderboardLines: LeaderboardLine[];
  /**
   * The leaderboard event time should be equal to the time of the virtual match the leaderboard is being generated for.
   * (i.e. The last virtual match to have completed for this leaderboard).
   * The virtual match time is typically the end-time of the latest of the real matches of that virtual match.
   */
  leaderboardEventTime: number;
}
