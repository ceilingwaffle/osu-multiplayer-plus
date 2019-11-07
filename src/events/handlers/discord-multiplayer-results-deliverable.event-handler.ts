import { MultiplayerResultsDeliverableEvent } from "../multiplayer-results-deliverable.event";
import { Log } from "../../utils/Log";
import { EventHandler } from "../classes/event-handler";

export class DiscordMultiplayerResultsDeliverableEventHandler extends EventHandler<MultiplayerResultsDeliverableEvent> {
  constructor() {
    super(MultiplayerResultsDeliverableEvent);
  }

  async handle(event: MultiplayerResultsDeliverableEvent): Promise<boolean> {
    Log.info(`TODO: Handle MultiplayerResultsDeliverableEvent...`, {
      reportables: event.reportables,
      gameMessageTargets: event.gameMessageTargets
    });
    return true;
  }
}
