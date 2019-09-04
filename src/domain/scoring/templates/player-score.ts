import { Player } from "./player";

export interface PlayerScore {
  player: Player;
  passed: boolean;
  score: number;
  mods: string;
}
