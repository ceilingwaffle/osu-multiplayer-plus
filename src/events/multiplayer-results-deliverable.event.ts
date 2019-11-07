import { IEvent } from "./interfaces/event";
import { ReportableContextType } from "../multiplayer/reports/reportable-context-type";
import { ReportableContext } from "../multiplayer/reports/reportable-context";
import { GameMessageTarget } from "../domain/game/game-message-target";

export class MultiplayerResultsDeliverableEvent implements IEvent {
  constructor(public reportables: ReportableContext<ReportableContextType>[], public gameMessageTargets: GameMessageTarget[]) {}
}
