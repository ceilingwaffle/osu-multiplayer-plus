import { IEvent } from "./interfaces/event";
import { ReportableContext, ReportableContextType } from "../domain/game/game-match-reported.entity";

export class MultiplayerResultsDeliverableEvent implements IEvent {
  constructor(public reportables: ReportableContext<ReportableContextType>[]) {}
}
