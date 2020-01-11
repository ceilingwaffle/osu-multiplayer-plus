import { MessageType } from "../messages/types/message-type";
import { LobbyBeatmapStatusMessage } from "../messages/classes/lobby-beatmap-status-message";
import { GameEventType } from "../game-events/types/game-event-types";
import { VirtualMatchKey } from "../virtual-match/virtual-match-key";
import { ReportableContextType } from "./reportable-context-type";
import { GameModeType } from "../../domain/game/modes/game-mode-types";
import { IGameEvent } from "../game-events/interfaces/game-event-interface";
import { Leaderboard } from "../components/leaderboard";

export type ReportableContext<T extends ReportableContextType> = VirtualMatchKey & {
  /** Message or GameEvent */
  type: T;
  /** The specific type of Message or GameEvent */
  subType: T extends "message" ? MessageType : T extends "game_event" ? GameEventType : T extends "leaderboard" ? GameModeType : never; // prettier-ignore
  /** The original message/event object */
  item: T extends "message" ? LobbyBeatmapStatusMessage<MessageType> : T extends "game_event" ? IGameEvent : T extends "leaderboard" ? Leaderboard : never; // prettier-ignore
  /** The time in which the message/event occurred */
  time: number;
};
