/**
 * Information about a multi match class
 */
export type MultiMatch = {
  /**
   * The match ID
   */
  matchId: number;
  /**
   * The name of the multi lobby
   */
  name: string;
  /**
   * The time the match was started
   */
  startTime: Date;
  /**
   * The time the match was ended
   */
  endTime: Date;
};
