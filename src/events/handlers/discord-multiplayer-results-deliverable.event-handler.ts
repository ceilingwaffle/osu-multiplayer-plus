import { MultiplayerResultsDeliverableEvent } from "../multiplayer-results-deliverable.event";
import { Log } from "../../utils/Log";
import { EventHandler } from "../classes/event-handler";
import iocContainer from "../../inversify.config";
import { TYPES } from "../../types";
import { DiscordBot } from "../../discord/discord-bot";
import { DiscordMessage } from "./discord-message";
import { DeliveredMessageReport } from "./delivered-message-report";
import { ReportableContext } from "../../multiplayer/reports/reportable-context";
import { ReportableContextType } from "../../multiplayer/reports/reportable-context-type";
import { GameMessageTarget } from "../../domain/game/game-message-target";

export class DiscordMultiplayerResultsDeliverableEventHandler extends EventHandler<MultiplayerResultsDeliverableEvent> {
  constructor() {
    super(MultiplayerResultsDeliverableEvent);
  }

  async handle(event: MultiplayerResultsDeliverableEvent): Promise<boolean> {
    return await DiscordMultiplayerResultsDeliverableEventHandler.deliverReportables(event.reportables, event.gameMessageTargets);
  }

  private static async deliverReportables(
    reportables: ReportableContext<ReportableContextType>[],
    destinations: GameMessageTarget[]
  ): Promise<boolean> {
    Log.info(`Delivering reportables...`, { reportables: reportables, gameMessageTargets: destinations });

    const discordBot: DiscordBot = iocContainer.get<DiscordBot>(TYPES.DiscordBot);

    const sentMessagePromises: Promise<DeliveredMessageReport<DiscordMessage>>[] = [];

    // build message
    const message = new DiscordMessage(reportables);
    await message.pushEmbedsFromReportables();

    destinations.forEach(destination => {
      // ignore non-discord destinations
      if (destination.commType !== "discord") return;

      const sentMessagePromise = discordBot.sendChannelMessage(message, destination.channelId);
      sentMessagePromises.push(sentMessagePromise);
    });

    try {
      // send messages
      await Promise.all(sentMessagePromises);
    } catch (error) {
      // TODO: Log more info about which message failed to send
      Log.methodFailure(
        DiscordMultiplayerResultsDeliverableEventHandler.deliverReportables,
        DiscordMultiplayerResultsDeliverableEventHandler.name,
        error
      );
      return false;
    }

    Log.methodSuccess(
      DiscordMultiplayerResultsDeliverableEventHandler.deliverReportables,
      DiscordMultiplayerResultsDeliverableEventHandler.name
    );
    return true;
  }
}
