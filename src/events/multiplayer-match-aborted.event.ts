import { IEvent } from "./interfaces/event";
import { ReportableContextType } from "../multiplayer/reports/reportable-context-type";
import { ReportableContext } from "../multiplayer/reports/reportable-context";

export class MultiplayerMatchAborted implements IEvent {
  constructor(public reportables: ReportableContext<ReportableContextType>[]) {}
}
