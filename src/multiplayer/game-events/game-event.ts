import { GameEventType } from "./game-event-types";
import { VirtualMatch } from "../virtual-match";
import { Game } from "../../domain/game/game.entity";
import { CustomGameEventDataProps, RequiredGameEventDataProps } from "./abstract-game-event";

export interface GameEvent {
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
  after?: () => void;
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
//     case "team_won_match":
//       return VirtualMatchCreator.getLatestVirtualMatchCompletedByAllLobbiesForGame(game);
//     // Requires more than one or all VirtualMatches to determine if the event happened
//     case "team_on_winning_streak":
//       return VirtualMatchCreator.buildVirtualMatchesForGame(game);
//     default:
//       let _exhaustiveCheck: never = eventType;
//       return;
//   }
// };
