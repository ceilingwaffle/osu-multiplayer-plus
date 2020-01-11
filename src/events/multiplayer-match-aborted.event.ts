import { IEvent } from "./interfaces/event";
import { ReportableContextType } from "../multiplayer/reporting/reportable-context-type";
import { ReportableContext } from "../multiplayer/reporting/reportable-context";

export class MultiplayerMatchAborted implements IEvent {
  constructor(public reportables: ReportableContext<ReportableContextType>[]) {}
}
