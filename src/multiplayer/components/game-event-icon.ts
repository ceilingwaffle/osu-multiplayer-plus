import { GameEventType } from "../game-events/types/game-event-types";

export interface GameEventIcon {
  eventEmoji: string;
  eventType: GameEventType;
  eventDescription: string;
}
