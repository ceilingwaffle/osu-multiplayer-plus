import { Match } from "../domain/match/match.entity";
import { LobbyBeatmapStatusMessage, MessageType } from "./lobby-beatmap-status-message";
import { GameRepository } from "../domain/game/game.repository";
import { getCustomRepository } from "typeorm";
import { VirtualMatch } from "./virtual-match";

export class MultiplayerResultsReporter {
  private readonly gameRepository: GameRepository = getCustomRepository(GameRepository);

  // .filter(filterOutMessagesForReportedMatches(reportedMatches))

  /**
   * Returns virtual matches not containing any of the given real matches
   *
   * @static
   * @param {{
   *     virtualMatches: VirtualMatch[];
   *     realMatches: Match[];
   *   }} {
   *     virtualMatches,
   *     realMatches
   *   }
   * @returns {VirtualMatch[]}
   */
  private static removeVirtualMatchesContainingRealMatches({
    virtualMatches,
    realMatches
  }: {
    virtualMatches: VirtualMatch[];
    realMatches: Match[];
  }): VirtualMatch[] {
    return virtualMatches.filter(vm => !vm.matches.some(vmm => realMatches.some(rm => vmm.id === rm.id)));
  }
}

function filterOutMessagesForReportedMatches(
  reportedMatches: Match[]
): (value: LobbyBeatmapStatusMessage<MessageType>, index: number, array: LobbyBeatmapStatusMessage<MessageType>[]) => unknown {
  return message => !reportedMatches.find(rm => message.match && message.match.entityId && message.match.entityId === rm.id);
}
