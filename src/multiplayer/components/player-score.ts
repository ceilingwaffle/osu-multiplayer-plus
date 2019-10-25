import { Mods } from "./enums/mods";
import { ScoreLetterGrade } from "./types/score-letter-grade";

export interface PlayerScore {
  osuUserId: string;
  passed: boolean;
  score: number;
  mods: Mods;
  scoreLetterGrade: ScoreLetterGrade;
}
