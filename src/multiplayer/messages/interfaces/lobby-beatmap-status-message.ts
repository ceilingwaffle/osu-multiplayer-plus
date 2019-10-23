import { Lobby } from "../../components/lobby";
import { Match } from "../../components/match";
import { MessageType } from "../types/message-type";

export interface LobbyBeatmapStatusMessage<T extends MessageType> {
  type: T;
  message: string;
  sameBeatmapNumber: number;
  beatmapId: string;
  lobby?: Lobby;
  match?: Match;
  /** The timestamp of when the event happened */
  time: number;
}
