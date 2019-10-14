import { GameEventType } from "./game-event-types";
import { GameEventData } from "./game-event-data";
import { VirtualMatch } from "../virtual-match";
import { VirtualMatchCreator } from "../virtual-match-creator";
import { Game } from "../../domain/game/game.entity";

export interface GameEvent extends GameEventData {
  readonly type: GameEventType;
  happenedIn: ({ game, virtualMatches }: { game: Game; virtualMatches: VirtualMatch | VirtualMatch[] }) => boolean;
  after?: () => void;
}

export const getCompletedVirtualMatchesOfGameForGameEventType = ({
  eventType,
  game
}: {
  eventType: GameEventType;
  game: Game;
}): VirtualMatch | VirtualMatch[] => {
  // TODO: Optimize - cache these VirtualMatch results for each game
  switch (eventType) {
    // Requires only one VirtualMatch to determine if the event happened
    case "team_eliminated":
    case "team_won_match":
      return VirtualMatchCreator.getLatestVirtualMatchCompletedByAllLobbiesForGame(game);
    // Requires more than one or all VirtualMatches to determine if the event happened
    case "team_on_winning_streak":
      return VirtualMatchCreator.buildVirtualMatchesForGame(game);
    default:
      let _exhaustiveCheck: never = eventType;
      return;
  }
};
