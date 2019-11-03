import { GameEventType } from "../types/game-event-types";
import { VirtualMatch } from "../../virtual-match/virtual-match";
import { Game } from "../../../domain/game/game.entity";
import { RequiredGameEventDataProps } from "../types/required-game-event-data-props";
import { CustomGameEventDataProps } from "../types/custom-game-event-data-props";

/**
 * Some event that happened in a game.
 * Game events should be indifferent to the game mode - e.g. "best of n matches" vs. "battle royale"
 *
 * @export
 * @interface IGameEvent
 */
export interface IGameEvent {
  readonly type: GameEventType;
  happenedIn: ({
    game,
    targetVirtualMatch,
    allVirtualMatches
  }: {
    game: Game;
    targetVirtualMatch: VirtualMatch;
    allVirtualMatches?: VirtualMatch[];
  }) => boolean;
  after?: () => Promise<void>;
  data: any extends CustomGameEventDataProps<RequiredGameEventDataProps> ? CustomGameEventDataProps<RequiredGameEventDataProps> : never;
}

// export const getCompletedVirtualMatchesOfGameForGameEventType = ({
//   eventType,
//   game
// }: {
//   eventType: GameEventType;
//   game: Game;
// }): VirtualMatch | VirtualMatch[] => {
//   // TODO: Optimize - cache these VirtualMatch results for each game
//   switch (eventType) {
//     // Requires only one VirtualMatch to determine if the event happened
//     case "team_eliminated":
//     case "team_scored_highest":
//       return VirtualMatchCreator.getLatestVirtualMatchCompletedByAllLobbiesForGame(game);
//     // Requires more than one or all VirtualMatches to determine if the event happened
//     case "team_on_winning_streak":
//       return VirtualMatchCreator.buildVirtualMatchesForGame(game);
//     default:
//       let _exhaustiveCheck: never = eventType;
//       return;
//   }
// };
