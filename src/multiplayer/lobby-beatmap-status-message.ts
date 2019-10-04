import { Lobby } from "./components/lobby";
import { Beatmap } from "./components/beatmap";
import { Match } from "./components/match";

export interface LobbyBeatmapStatusMessage {
  lobby: Lobby;
  message: string;
  match: Match;
}
