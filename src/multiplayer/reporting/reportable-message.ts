import { ReportableContext } from "./reportable-context";
import { ReportableContextType } from "./reportable-context-type";

export abstract class ReportableMessage {
  // export type ReportableMessage = DiscordMessage; // | WebMessage

  constructor(protected reportables: ReportableContext<ReportableContextType>[]) {}

  getReportables(): ReportableContext<ReportableContextType>[] {
    return this.reportables;
  }
}
