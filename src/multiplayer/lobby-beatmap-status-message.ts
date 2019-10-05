import { Lobby } from "./components/lobby";
import { Match } from "./components/match";

type MessageType = "completed" | "waiting";

interface LobbyBeatmapStatusMessage<T extends MessageType> {
  type?: T;
  message: string;
  lobby: Lobby;
  match: Match;
  sameBeatmapNumber: number;
}

export interface CompletedLobbyBeatmapStatusMessage extends LobbyBeatmapStatusMessage<"completed"> {}
export interface WaitingLobbyBeatmapStatusMessage extends LobbyBeatmapStatusMessage<"waiting"> {}
