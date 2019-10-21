import { Match } from "../domain/match/match.entity";
import { LobbyBeatmapStatusMessage, MessageType } from "./lobby-beatmap-status-message";
import { VirtualMatch } from "./virtual-match";
import { VirtualMatchReportData } from "./virtual-match-report-data";
import { Game } from "../domain/game/game.entity";
import { ReportableContext, ReportableContextType } from "../domain/game/game-match-reported.entity";
import _ = require("lodash"); // do not convert to default import -- it will break!!

export class MultiplayerResultsReporter {
  static getItemsToBeReported(args: {
    virtualMatchReportDatas: VirtualMatchReportData[];
    game: Game;
  }): { allReportables: ReportableContext<ReportableContextType>[]; toBeReported: ReportableContext<ReportableContextType>[] } {
    const allReportables: ReportableContext<ReportableContextType>[] = MultiplayerResultsReporter.getAllReportableItemsForGame({
      virtualMatchReportDatas: args.virtualMatchReportDatas
    });
    const reported: ReportableContext<ReportableContextType>[] = MultiplayerResultsReporter.getAlreadyReportedItemsForGame({
      virtualMatchReportDatas: args.virtualMatchReportDatas,
      game: args.game
    });
    const toBeReported: ReportableContext<ReportableContextType>[] = _.differenceWith<
      ReportableContext<ReportableContextType>,
      ReportableContext<ReportableContextType>
    >(allReportables, reported, _.isEqual);

    return { allReportables, toBeReported };
  }

  private static getAllReportableItemsForGame(args: {
    virtualMatchReportDatas: VirtualMatchReportData[];
  }): ReportableContext<ReportableContextType>[] {
    const reportable: ReportableContext<ReportableContextType>[] = [];

    args.virtualMatchReportDatas.forEach(vmrData => {
      if (vmrData.events) {
        vmrData.events.forEach(e => {
          const reportedContext: ReportableContext<"game_event"> = {
            type: "game_event",
            subType: e.type,
            item: e,
            beatmapId: e.data.eventMatch.beatmapId,
            sameBeatmapNumber: e.data.eventMatch.sameBeatmapNumber,
            time: e.data.timeOfEvent
          };
          reportable.push(reportedContext);
        });
      }
      if (vmrData.messages) {
        vmrData.messages.forEach(msgs => {
          msgs.forEach(msg => {
            const reportedContext: ReportableContext<"message"> = {
              type: "message",
              subType: msg.type,
              item: msg,
              beatmapId: msg.beatmapId,
              sameBeatmapNumber: msg.sameBeatmapNumber,
              time: msg.time
            };
            reportable.push(reportedContext);
          });
        });
      }
      if (vmrData.leaderboards) {
        throw new Error("TODO: Implement method of MultiplayerResultsReporter.");
      }
    });

    return reportable;
  }

  private static getAlreadyReportedItemsForGame(args: {
    virtualMatchReportDatas: VirtualMatchReportData[];
    game: Game;
  }): ReportableContext<ReportableContextType>[] {
    const reported: ReportableContext<ReportableContextType>[] = [];

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
        } else if (reportedContext.type === "leaderboard") {
          // get the virtual match key of the latest-reported virtual match from the already-reported reportables
          throw new Error("TODO: Implement method of MultiplayerResultsReporter.");
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
