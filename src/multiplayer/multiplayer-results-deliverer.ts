import TYPES from "../types";
import { IEventDispatcher } from "../utils/event-dispatcher";
import { ReportableContext, ReportableContextType } from "../domain/game/game-match-reported.entity";
import { MultiplayerResultsDeliverableEvent } from "./events/multiplayer-results-deliverable.event";
import iocContainer from "../inversify.config";

export class MultiplayerResultsDeliverer {
  static async deliver(args: { reportables: ReportableContext<ReportableContextType>[] }): Promise<void> {
    const dispatcher = iocContainer.get<IEventDispatcher>(TYPES.IEventDispatcher);
    await dispatcher.dispatch(new MultiplayerResultsDeliverableEvent(args.reportables));
  }
}
