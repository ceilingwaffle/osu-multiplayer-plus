import { Lobby } from "../components/lobby";
import { LobbyBeatmapStatusMessage } from "./classes/lobby-beatmap-status-message";

export interface LobbyAwaitingBeatmapMessage extends LobbyBeatmapStatusMessage<"lobby_awaiting"> {
  lobby: Lobby;
}
