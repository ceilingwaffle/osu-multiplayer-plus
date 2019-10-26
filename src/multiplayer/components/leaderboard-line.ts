import { GameEventIcon } from "./game-event-icon";
import { ScoreLetterGrade } from "./types/score-letter-grade";

export interface LeaderboardLine {
  team: {
    teamName: string;
    teamNumber: number;
    players: LeaderboardLinePlayer[];
  };
  alive: boolean;
  position: {
    currentPosition: number;
    previousPosition?: number;
    change?: LeaderboardLinePositionChange;
  };
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

export type LeaderboardLinePositionChange = "gained" | "lost" | "same";
