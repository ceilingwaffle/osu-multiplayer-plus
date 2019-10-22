import { GameEventIcon } from "./game-event-icon";
import { MapRank } from "./types/map-rank";

export interface LeaderboardLine {
  team: {
    teamName: string;
    teamNumber: number;
    players: {
      osuUsername: string;
      scoreSubmitted: boolean;
      score: {
        score: number;
        rankAchieved: MapRank;
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
