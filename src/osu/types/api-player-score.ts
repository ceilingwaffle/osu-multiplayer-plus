import { ScoreLetterGrade } from "../../multiplayer/components/types/score-letter-grade";

export interface ApiPlayerScore {
  osuUserId: string;
  score: number;
  passed: boolean;
  ignored?: boolean;
  scoreLetterGrade: ScoreLetterGrade;
  accuracy: number;
}
