import { Team } from "./team";
import { TeamStatus } from "./team-status";
import { TeamScore } from "./team-score";

export interface TeamMatchLine {
  team: Team;
  teamStatus: TeamStatus;
  teamScore: TeamScore;
  winStreak: number;
}
