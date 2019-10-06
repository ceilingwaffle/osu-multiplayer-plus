import { Lobby } from "./components/lobby";
import { Match } from "./components/match";

type MessageType = "lobby_completed" | "awaiting" | "all_lobbies_completed";

interface LobbyBeatmapStatusMessage<T extends MessageType> {
  type?: T;
  message: string;
  sameBeatmapNumber: number;
}

interface HasLobbyAndMatchProps {
  lobby: Lobby;
  match: Match;
}

export interface LobbyCompletedBeatmapMessage extends HasLobbyAndMatchProps, LobbyBeatmapStatusMessage<"lobby_completed"> {}
export interface LobbyAwaitingBeatmapMessage extends HasLobbyAndMatchProps, LobbyBeatmapStatusMessage<"awaiting"> {}
export interface AllLobbiesCompletedBeatmapMessage extends LobbyBeatmapStatusMessage<"all_lobbies_completed"> {}
export type LobbyBeatmapStatusMessageTypes = LobbyCompletedBeatmapMessage | LobbyAwaitingBeatmapMessage | AllLobbiesCompletedBeatmapMessage;
