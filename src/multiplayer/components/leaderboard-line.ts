import { Team } from "./team";
import { TeamStatus } from "./team-status";
import { TeamScore } from "./team-score";

export interface LeaderboardLine {
  team: Team;
  teamStatus: TeamStatus;
  teamScore: TeamScore;
}
