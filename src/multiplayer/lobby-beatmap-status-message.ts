import { Lobby } from "./components/lobby";
import { Beatmap } from "./components/beatmap";

export interface LobbyBeatmapStatusMessage {
  message: string;
  beatmap: Beatmap;
  lobby: Lobby;
}
