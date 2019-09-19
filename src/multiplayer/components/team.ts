import { Player } from "./player";

export interface Team {
  id: number;
  number: number;
  colorName: string;
  colorValue: string;
  name?: string;
  /** The rank of the team in the game (i.e. the position on the leaderboard) */
  position: number;
  members: Player[];
}
