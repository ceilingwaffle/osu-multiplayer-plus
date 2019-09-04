import { PlayerScore } from "./player-score";

export interface TeamScore {
  teamScore: number;
  playerScores: PlayerScore[];
}
