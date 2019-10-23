import { LobbyBeatmapStatusMessage } from "../classes/lobby-beatmap-status-message";
import { MessageType } from "./message-type";

export type LobbyBeatmapStatusMessageGroup = Map<MessageType, LobbyBeatmapStatusMessage<MessageType>[]>;
