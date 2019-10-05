import { Lobby } from "./components/lobby";
import { Beatmap } from "./components/beatmap";
import { Match } from "./components/match";

export interface LobbyBeatmapStatusMessage {
  message: string;
  lobby: Lobby;
  match: Match;
  beatmapNumber: number;
}
