import { Mods } from "./enums/mods";

export interface PlayerScore {
  osuUserId: string;
  passed: boolean;
  score: number;
  mods: Mods;
}
