import { GameEventType } from "../game-events/types/game-event-types";
import { IGameEvent } from "../game-events/interfaces/game-event-interface";

export interface GameEventIcon {
  eventEmoji: string;
  eventType: GameEventType;
  eventDescription: string;
  event?: IGameEvent;
}
