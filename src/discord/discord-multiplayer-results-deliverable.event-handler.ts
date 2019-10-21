import { EventHandler } from "../utils/event-dispatcher";
import { MultiplayerResultsDeliverableEvent } from "../multiplayer/events/multiplayer-results-deliverable.event";
import { Log } from "../utils/Log";

export class DiscordMultiplayerResultsDeliverableEventHandler extends EventHandler<MultiplayerResultsDeliverableEvent> {
  constructor() {
    super(MultiplayerResultsDeliverableEvent);
  }

  async handle(event: MultiplayerResultsDeliverableEvent): Promise<boolean> {
    Log.info(`TODO: Handle MultiplayerResultsDeliverableEvent...`, event.reportables);
    return true;
  }
}
