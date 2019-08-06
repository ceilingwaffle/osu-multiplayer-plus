/**
 * General Score class
 */
export type Score = {
  /**
   * Score achieved
   */
  score: number;
  count300: number;
  count100: number;
  count50: number;
  countMiss: number;
  maxCombo: number;
  countKatu: number;
  countGeki: number;
  /**
   * True if maximum combo reached of map
   */
  perfect: boolean;
};
