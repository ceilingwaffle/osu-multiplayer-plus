import { Game } from "../../domain/game/game.entity";
import { GameEventType } from "./game-event-types";
import { GameEventData } from "./game-event-data";

export interface GameEvent extends GameEventData {
  readonly type: GameEventType;
  happenedIn: (payload: Game) => boolean;
  after?: () => void;
}
