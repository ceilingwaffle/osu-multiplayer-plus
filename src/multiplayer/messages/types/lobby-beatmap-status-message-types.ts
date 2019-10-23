import { LobbyAwaitingBeatmapMessage } from "../lobby-awaiting-beatmap-message";
import { LobbyCompletedBeatmapMessage } from "../lobby-completed-beatmap-message";
import { AllLobbiesCompletedBeatmapMessage } from "../all-lobbies-completed-beatmap-message";

export type LobbyBeatmapStatusMessageTypes = LobbyCompletedBeatmapMessage | LobbyAwaitingBeatmapMessage | AllLobbiesCompletedBeatmapMessage;
