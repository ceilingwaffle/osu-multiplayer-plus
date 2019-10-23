import { Lobby } from "../components/lobby";
import { LobbyBeatmapStatusMessage } from "./interfaces/lobby-beatmap-status-message";

export interface LobbyAwaitingBeatmapMessage extends LobbyBeatmapStatusMessage<"lobby_awaiting"> {
  lobby: Lobby;
}
