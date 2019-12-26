import { VirtualMatch } from "../../virtual-match/virtual-match";
import { Game } from "../../../domain/game/game.entity";

export type RequiredGameEventDataProps = {
  eventMatch: VirtualMatch;
  /** The timestamp of when the event happened */
  timeOfEvent: number;
  teamId?: number;
  game: Game;
};
