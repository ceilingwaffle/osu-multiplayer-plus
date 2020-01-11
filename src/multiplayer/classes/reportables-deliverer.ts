import iocContainer from "../../inversify.config";
import TYPES from "../../types";
import { ReportableContextType } from "../reporting/reportable-context-type";
import { ReportableContext } from "../reporting/reportable-context";
import { MultiplayerResultsDeliverableEvent } from "../../events/multiplayer-results-deliverable.event";
import { IEventDispatcher } from "../../events/interfaces/event-dispatcher";
import { GameMessageTarget } from "../../domain/game/game-message-target";

export class ReportablesDeliverer {
  static async deliver(args: {
    reportables: ReportableContext<ReportableContextType>[];
    gameMessageTargets: GameMessageTarget[];
  }): Promise<void> {
    const dispatcher = iocContainer.get<IEventDispatcher>(TYPES.IEventDispatcher);
    await dispatcher.dispatch(new MultiplayerResultsDeliverableEvent(args.reportables, args.gameMessageTargets));
  }
}
