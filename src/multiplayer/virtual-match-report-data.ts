import { GameEvent } from "./game-events/game-event";
import { LobbyBeatmapStatusMessageGroup } from "./lobby-beatmap-status-message";
import { VirtualMatchKey } from "./virtual-match-key";
import { Leaderboard } from "./leaderboards/leaderboard";

export interface VirtualMatchReportData extends VirtualMatchKey {
  events?: GameEvent[];
  messages?: LobbyBeatmapStatusMessageGroup;
  leaderboards?: Leaderboard;
  // if any other properties are added here, remember to include it in the MultiplayerResultsReported.getAllReportableItemsForGame method
}
