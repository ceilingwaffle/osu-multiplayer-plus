import { Match } from "../domain/match/match.entity";
import { LobbyBeatmapStatusMessage, MessageType } from "./lobby-beatmap-status-message";
import { VirtualMatch } from "./virtual-match";
import { VirtualMatchReportData } from "./virtual-match-report-data";
import { Game } from "../domain/game/game.entity";
import { ReportedContext, ReportedContextType } from "../domain/game/game-match-reported.entity";
import _ = require("lodash"); // do not convert to default import -- it will break!!

export class MultiplayerResultsReporter {
  static reportVirtualMatchesIfNotYetReportedForGame(args: { virtualMatchReportDatas: VirtualMatchReportData[]; game: Game }) {
    const toBeReported: ReportedContext<ReportedContextType>[] = MultiplayerResultsReporter.getItemsToBeReported(args);

    // TODO: Test that toBeReported correctly filtered out some items (after we implement the ReportedMatch saving)

    // TODO: Deliver report items?

    const a = true;

    // throw new Error("TODO: Implement method of MultiplayerResultsReporter.");
  }

  private static getItemsToBeReported(args: {
    virtualMatchReportDatas: VirtualMatchReportData[];
    game: Game;
  }): ReportedContext<ReportedContextType>[] {
    const reportable: ReportedContext<ReportedContextType>[] = MultiplayerResultsReporter.getAllReportableItemsForGame({
      virtualMatchReportDatas: args.virtualMatchReportDatas
    });
    const reported: ReportedContext<ReportedContextType>[] = MultiplayerResultsReporter.getAlreadyReportedItemsForGame({
      virtualMatchReportDatas: args.virtualMatchReportDatas,
      game: args.game
    });
    const toBeReported: ReportedContext<ReportedContextType>[] = _.differenceWith<
      ReportedContext<ReportedContextType>,
      ReportedContext<ReportedContextType>
    >(reportable, reported, _.isEqual);
    return toBeReported;
  }

  private static getAllReportableItemsForGame(args: {
    virtualMatchReportDatas: VirtualMatchReportData[];
  }): ReportedContext<ReportedContextType>[] {
    const reportable: ReportedContext<ReportedContextType>[] = [];

    args.virtualMatchReportDatas.forEach(vmrData => {
      if (vmrData.events) {
        vmrData.events.forEach(e => {
          const reportedContext: ReportedContext<"game_event"> = {
            type: "game_event",
            subType: e.type,
            beatmapId: e.data.eventMatch.beatmapId,
            sameBeatmapNumber: e.data.eventMatch.sameBeatmapNumber
          };
          reportable.push(reportedContext);
        });
      }
      if (vmrData.messages) {
        vmrData.messages.forEach(msgs => {
          msgs.forEach(msg => {
            const reportedContext: ReportedContext<"message"> = {
              type: "message",
              subType: msg.type,
              beatmapId: msg.beatmapId,
              sameBeatmapNumber: msg.sameBeatmapNumber
            };
            reportable.push(reportedContext);
          });
        });
      }
    });

    return reportable;
  }

  private static getAlreadyReportedItemsForGame(args: {
    virtualMatchReportDatas: VirtualMatchReportData[];
    game: Game;
  }): ReportedContext<ReportedContextType>[] {
    const reported: ReportedContext<ReportedContextType>[] = [];

    args.game.gameMatchesReported.forEach(gmr => {
      const reportedContext = gmr.reportedContext;

      args.virtualMatchReportDatas.forEach(vmrData => {
        if (reportedContext.type === "game_event") {
          if (
            vmrData.events &&
            vmrData.events.find(
              e =>
                e.type === reportedContext.subType &&
                e.data.eventMatch.beatmapId === reportedContext.beatmapId &&
                e.data.eventMatch.sameBeatmapNumber === reportedContext.sameBeatmapNumber
            )
          ) {
            reported.push(reportedContext);
          }
        } else if (reportedContext.type === "message") {
          const msgs = vmrData.messages.get(reportedContext.subType as MessageType);
          if (
            msgs &&
            msgs.find(
              m =>
                m.type === reportedContext.subType &&
                m.beatmapId === reportedContext.beatmapId &&
                m.sameBeatmapNumber === reportedContext.sameBeatmapNumber
            )
          ) {
            reported.push(reportedContext);
          }
        } else {
          const _exhaustiveCheck: never = reportedContext.type;
        }
      });
    });

    return reported;
  }

  // /**
  //  * Returns virtual matches not containing any of the given real matches
  //  */
  // private static removeVirtualMatchesContainingRealMatches(args: { virtualMatches: VirtualMatch[]; realMatches: Match[] }): VirtualMatch[] {
  //   return args.virtualMatches.filter(vm => !vm.matches.some(vmm => args.realMatches.some(rm => vmm.id === rm.id)));
  // }
}

// function filterOutMessagesForReportedMatches(
//   reportedMatches: Match[]
// ): (value: LobbyBeatmapStatusMessage<MessageType>, index: number, array: LobbyBeatmapStatusMessage<MessageType>[]) => unknown {
//   return message => !reportedMatches.find(rm => message.match && message.match.entityId && message.match.entityId === rm.id);
// }
