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
  public discordBot: DiscordBot = iocContainer.get<DiscordBot>(TYPES.DiscordBot);

  constructor() {
    super(MultiplayerResultsDeliverableEvent);
  }

  async handle(event: MultiplayerResultsDeliverableEvent): Promise<boolean> {
    Log.info(`TODO: Handle MultiplayerResultsDeliverableEvent...`, {
      reportables: event.reportables,
      gameMessageTargets: event.gameMessageTargets
    });

    return this.deliverReportables(event.reportables, event.gameMessageTargets);
  }

  async deliverReportables(reportables: ReportableContext<ReportableContextType>[], destinations: GameMessageTarget[]): Promise<boolean> {
    const sentMessagePromises: Promise<DeliveredMessageReport<DiscordMessage>>[] = [];

    reportables.forEach(reportable => {
      // build message
      const message = new DiscordMessage(reportable);

      destinations.forEach(destination => {
        // ignore non-discord destinations
        if (destination.commType !== "discord") return;

        const sentMessagePromise = this.discordBot.sendChannelMessage(message, destination.channelId);
        sentMessagePromises.push(sentMessagePromise);
      });
    });

    try {
      // send messages
      await Promise.all(sentMessagePromises);
    } catch (error) {
      // TODO: Log more info about which message failed to send
      Log.methodFailure(this.handle, this.constructor.name, error);
      return false;
    }

    return true;
  }
}
