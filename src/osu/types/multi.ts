import { MultiMatch } from "./multi-match";
import { MultiGame } from "./multi-game";

export type Multi = {
  /**
   * Information about the multi match
   */
  match: MultiMatch;
  /**
   * The games played within the multi
   */
  games: MultiGame[];
};
