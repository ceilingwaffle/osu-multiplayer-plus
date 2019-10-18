import { GameEvent } from "./game-events/game-event";
import { LobbyBeatmapStatusMessageGroup } from "./lobby-beatmap-status-message";
import { VirtualMatchKey } from "./virtual-match-key";

export interface VirtualMatchReportData extends VirtualMatchKey {
  events?: GameEvent[];
  messages?: LobbyBeatmapStatusMessageGroup;
  // if any other properties are added here, remember to include it in the MultiplayerResultsReported.getAllReportablesForGame method
}
