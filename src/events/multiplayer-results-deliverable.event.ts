import { IEvent } from "./interfaces/event";
import { ReportableContextType } from "../multiplayer/reporting/reportable-context-type";
import { ReportableContext } from "../multiplayer/reporting/reportable-context";
import { GameMessageTarget } from "../domain/game/game-message-target";

export class MultiplayerResultsDeliverableEvent implements IEvent {
  constructor(public reportables: ReportableContext<ReportableContextType>[], public gameMessageTargets: GameMessageTarget[]) {}
}
