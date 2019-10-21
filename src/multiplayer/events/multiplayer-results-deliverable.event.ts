import { IEvent } from "../../utils/event-dispatcher";
import { ReportableContext, ReportableContextType } from "../../domain/game/game-match-reported.entity";

export class MultiplayerResultsDeliverableEvent implements IEvent {
  constructor(public reportables: ReportableContext<ReportableContextType>[]) {}
}
