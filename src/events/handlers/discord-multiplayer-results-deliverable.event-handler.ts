import { MultiplayerResultsDeliverableEvent } from "../multiplayer-results-deliverable.event";
import { Log } from "../../utils/log";
import { EventHandler } from "../classes/event-handler";
import iocContainer from "../../inversify.config";
import { TYPES } from "../../types";
import { DiscordBot } from "../../discord/discord-bot";
import { DiscordMessage } from "../../discord/discord-message";
import { DeliveredMessageReport } from "../../multiplayer/reporting/delivered-message-report";
import { ReportableContext } from "../../multiplayer/reporting/reportable-context";
import { ReportableContextType } from "../../multiplayer/reporting/reportable-context-type";
import { GameMessageTarget } from "../../domain/game/game-message-target";
import { DeliveredReportable } from "../../domain/reportable/delivered-reportable.entity";
import { ReportableMessage } from "../../multiplayer/reporting/reportable-message";

export class DiscordMultiplayerResultsDeliverableEventHandler extends EventHandler<MultiplayerResultsDeliverableEvent> {
  constructor() {
    super(MultiplayerResultsDeliverableEvent);
  }

  async handle(event: MultiplayerResultsDeliverableEvent): Promise<boolean> {
    let deliveredMessageReports: DeliveredMessageReport<ReportableMessage>[] = [];

    try {
      deliveredMessageReports = await DiscordMultiplayerResultsDeliverableEventHandler.deliverReportables(
        event.reportables,
        event.gameMessageTargets
      );
    } catch (error) {
      Log.methodError(this.handle, this.constructor.name, error);
      return false;
    }

    // const totalDelivered = deliveredMessageReports.filter(dmr => dmr.delivered).length;
    // let savedDeliveredReportables = 0;

    // try {
    //   for (const report of deliveredMessageReports) {
    //     if (report.delivered) {
    //       for (const reported of report.originalMessage.getReportables()) {
    //         // TODO - Optimize N+1
    //         const gmr = new DeliveredReportable();
    //         gmr.reportedContext = reported;
    //         gmr.game = event.game;
    //         // gmr.reportedToRealms = [...reported.destinations] // TODO
    //         // save entity to DB
    //         await gmr.save();
    //         savedDeliveredReportables++;
    //       }
    //     }
    //   }
    //   Log.info("Delivered reportables:", { totalDelivered: totalDelivered, savedDeliveredReportables: savedDeliveredReportables });
    // } catch (error) {
    //   Log.methodError(this.handle, this.constructor.name, error);
    //   throw error;
    // }
  }

  private static async deliverReportables(
    reportables: ReportableContext<ReportableContextType>[],
    destinations: GameMessageTarget[]
  ): Promise<DeliveredMessageReport<ReportableMessage>[]> {
    Log.info(`Delivering reportables...`, { reportablesCount: reportables.length, gameMessageTargets: destinations });
    const discordBot: DiscordBot = iocContainer.get<DiscordBot>(TYPES.DiscordBot);

    // build message
    const message = new DiscordMessage(reportables);
    await message.pushEmbedsFromReportables();

    const deliveredMessageReports: DeliveredMessageReport<ReportableMessage>[] = [];

    for (const destination of destinations) {
      // ignore non-discord destinations
      if (destination.commType !== "discord") return;
      const deliveredMessageReport = await discordBot.sendChannelMessage(message, destination.channelId);
      deliveredMessageReports.push(deliveredMessageReport);
    }

    Log.methodSuccess(
      DiscordMultiplayerResultsDeliverableEventHandler.deliverReportables,
      DiscordMultiplayerResultsDeliverableEventHandler.name,
      { failedMessageDeliveries: deliveredMessageReports.filter(r => !r.delivered).length }
    );

    return deliveredMessageReports;
  }
}
