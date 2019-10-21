import { GameEventIcon } from "./game-event-icon";
import { RankTypes } from "./rank-types";

export interface LeaderboardLine {
  team: {
    teamName: string;
    teamNumber: number;
    players: {
      osuUsername: string;
      scoreSubmitted: boolean;
      score: {
        score: number;
        rankAchieved: RankTypes;
        accuracy: number;
        highestScoreInTeam: boolean;
      };
    }[];
  };
  alive: boolean;
  position: {
    currentPosition: number;
    previousPosition: number;
    gainedPosition: boolean;
    lostPosition: boolean;
    samePosition: boolean;
  };
  event?: GameEventIcon;
  lives: {
    currentLives: number;
    startingLives: number;
  };
  teamScore: {
    teamScore: number;
    tiedWithTeamNumbers: number[];
  };
}
