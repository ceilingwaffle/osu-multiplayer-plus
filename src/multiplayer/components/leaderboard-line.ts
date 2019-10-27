import { GameEventIcon } from "./game-event-icon";
import { ScoreLetterGrade } from "./types/score-letter-grade";

export interface LeaderboardLine {
  team: {
    teamName: string;
    teamNumber: number;
    players: LeaderboardLinePlayer[];
  };
  alive: boolean;
  position: LeaderboardPositionals;
  eventIcon?: GameEventIcon;
  lives: {
    currentLives: number;
    startingLives: number;
  };
  teamScore: {
    teamScore: number;
    // tiedWithTeamNumbers: number[];
  };
}

export interface LeaderboardLinePlayer {
  osuUserId: string;
  osuUsername: string;
  scoreSubmitted: boolean;
  score: {
    score: number;
    scoreLetterGrade: ScoreLetterGrade;
    accuracy: number;
    highestScoreInTeam: boolean;
  };
}

export interface LeaderboardPositionals {
  currentPosition: number;
  previousPosition?: number;
  change?: LeaderboardLinePositionChange;
}

export type LeaderboardLinePositionChange = "gained" | "lost" | "same";
