import { Lobby } from "./components/lobby";
import { Match } from "./components/match";

type MessageType = "lobby_completed" | "lobby_awaiting" | "all_lobbies_completed";

interface LobbyBeatmapStatusMessage<T extends MessageType> {
  type?: T;
  message: string;
  sameBeatmapNumber: number;
}

export interface LobbyCompletedBeatmapMessage extends LobbyBeatmapStatusMessage<"lobby_completed"> {
  lobby: Lobby;
  match: Match;
}

export interface LobbyAwaitingBeatmapMessage extends LobbyBeatmapStatusMessage<"lobby_awaiting"> {
  lobby: Lobby;
}

export interface AllLobbiesCompletedBeatmapMessage extends LobbyBeatmapStatusMessage<"all_lobbies_completed"> {}
export type LobbyBeatmapStatusMessageTypes = LobbyCompletedBeatmapMessage | LobbyAwaitingBeatmapMessage | AllLobbiesCompletedBeatmapMessage;
