import { Lobby } from "./components/lobby";
import { Match } from "./components/match";

export type MessageType = "lobby_completed" | "lobby_awaiting" | "all_lobbies_completed";

export interface LobbyBeatmapStatusMessage<T extends MessageType> {
  type?: T;
  message: string;
  sameBeatmapNumber: number;
  beatmapId: string;
  lobby?: Lobby;
  match?: Match;
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

// export interface LobbyBeatmapStatusMessageGroup {
//   completedBeatmaps: LobbyCompletedBeatmapMessage[];
//   awaitingBeatmaps: LobbyAwaitingBeatmapMessage[];
//   allLobbiesCompleted: AllLobbiesCompletedBeatmapMessage[];
// }

export type LobbyBeatmapStatusMessageGroup = Map<MessageType, LobbyBeatmapStatusMessage<MessageType>[]>;
