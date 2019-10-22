import { GameEventType } from "../game-events/game-event-types";

export interface GameEventIcon {
  eventEmoji: string;
  eventType: GameEventType;
  eventDescription: string;
}
