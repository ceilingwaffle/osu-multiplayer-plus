import { Score } from "./score";

/**
 * Scores in multi match data class
 */
export type MultiScore = Score & {
  /**
   * 0-based index of the player's slot in the lobby
   */
  slot: number;
  /**
   * The team the player is on if relevant
   */
  team: MultiTeamType_ | null;
  /**
   * If the player passed (i.e. played through, no fails/revives)
   */
  pass: boolean;
  /**
   * User who set the score
   */
  userId: number;
};
