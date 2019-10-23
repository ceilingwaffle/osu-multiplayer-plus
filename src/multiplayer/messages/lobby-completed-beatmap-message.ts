import { Lobby } from "../components/lobby";
import { Match } from "../components/match";
import { LobbyBeatmapStatusMessage } from "./interfaces/lobby-beatmap-status-message";

export interface LobbyCompletedBeatmapMessage extends LobbyBeatmapStatusMessage<"lobby_completed"> {
  lobby: Lobby;
  match: Match;
}
