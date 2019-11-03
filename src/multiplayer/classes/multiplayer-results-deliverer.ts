import iocContainer from "../../inversify.config";
import TYPES from "../../types";
import { ReportableContextType } from "../reports/reportable-context-type";
import { ReportableContext } from "../reports/reportable-context";
import { MultiplayerResultsDeliverableEvent } from "../../events/multiplayer-results-deliverable.event";
import { IEventDispatcher } from "../../events/interfaces/event-dispatcher";

export class MultiplayerResultsDeliverer {
  static async deliver(args: { reportables: ReportableContext<ReportableContextType>[] }): Promise<void> {
    const dispatcher = iocContainer.get<IEventDispatcher>(TYPES.IEventDispatcher);
    await dispatcher.dispatch(new MultiplayerResultsDeliverableEvent(args.reportables));
  }
}
