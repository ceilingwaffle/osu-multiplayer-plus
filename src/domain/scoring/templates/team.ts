import { Player } from "./player";

export interface Team {
  id: number;
  name?: string;
  gameRank: number;
  members: Player[];
}
