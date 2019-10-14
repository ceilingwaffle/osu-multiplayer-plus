import { Lobby } from "../domain/lobby/lobby.entity";
import { Match } from "../domain/match/match.entity";

/**
 * A virtual match represents one/many osu matches having played the same beatmap (in the same order) across one/many lobbies of a game.
 *
 * @export
 * @interface VirtualMatch
 */
export interface VirtualMatch {
  beatmapId: string;
  /** Number representing how many times (up to this point in time) the same beatmap was played in a lobby.
   * e.g. If beatmap with ID 123 was played 2 times in a lobby, this number will be 2 during the second time this beatmap was played. */
  sameBeatmapNumber: number;
  matches: Match[];
  lobbies: {
    /** Lobbies that have played this map */
    played: Lobby[];
    /** Lobbies remaining to play this map. If a lobby exists in both "remaining" and "played",
     * it means the lobby existing in remaining needs to "catch up" with the other lobbies in "played"
     * by playing the same map for some (n>1)th time */
    remaining: Lobby[];
    /** The greatest number of times any lobby has played this map */
    greatestPlayedCount: number;
  };
}
