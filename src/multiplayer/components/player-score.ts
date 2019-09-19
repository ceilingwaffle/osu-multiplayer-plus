import { Player } from "./player";

export interface PlayerScore {
  // player: Player;
  osuUserId: string;
  passed: boolean;
  score: number;
  mods: string;
}
