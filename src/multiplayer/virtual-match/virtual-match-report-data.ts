import { IGameEvent } from "../game-events/interfaces/game-event-interface";
import { LobbyBeatmapStatusMessageGroup } from "../messages/types/lobby-beatmap-status-message-group";
import { Leaderboard } from "../components/leaderboard";
import { VirtualMatchKey } from "./virtual-match-key";

export interface VirtualMatchReportData extends VirtualMatchKey {
  events?: IGameEvent[];
  messages?: LobbyBeatmapStatusMessageGroup;
  leaderboards?: Leaderboard[];
  // if any other properties are added here, remember to include it in the MultiplayerResultsReported.getAllReportableItemsForGame method
}
