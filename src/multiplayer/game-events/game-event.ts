import { GameEventType } from "./game-event-types";
import { GameEventData } from "./game-event-data";
import { VirtualBeatmap } from "../virtual-beatmap";
import { BeatmapLobbyGrouper } from "../beatmap-lobby-grouper";
import { Game } from "../../domain/game/game.entity";

export interface GameEvent extends GameEventData {
  readonly type: GameEventType;
  happenedIn: ({ game, virtualBeatmaps }: { game: Game; virtualBeatmaps: VirtualBeatmap | VirtualBeatmap[] }) => boolean;
  after?: () => void;
}

export const getCompletedVirtualBeatmapsOfGameForGameEventType = ({
  eventType,
  game
}: {
  eventType: GameEventType;
  game: Game;
}): VirtualBeatmap | VirtualBeatmap[] => {
  // TODO: Optimize - cache these values VirtualBeatmap results for each game
  const allCompletedMaps = BeatmapLobbyGrouper.buildBeatmapsGroupedByLobbyPlayedStatusesForGame(game);
  const latestCompletedMap = BeatmapLobbyGrouper.getLatestBeatmapCompletedByAllLobbiesForGame(game);

  switch (eventType) {
    case "team_eliminated":
      return latestCompletedMap;
    case "team_won_match":
      return latestCompletedMap;
    case "team_on_winning_streak":
      return allCompletedMaps;
    default:
      let _exhaustiveCheck: never = eventType;
      return;
  }
};
