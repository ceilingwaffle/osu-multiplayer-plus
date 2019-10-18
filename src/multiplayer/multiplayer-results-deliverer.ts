import { ReportableContext, ReportableContextType } from "../domain/game/game-match-reported.entity";

export class MultiplayerResultsDeliverer {
  async deliver(args: { reportables: ReportableContext<ReportableContextType>[] }): Promise<boolean> {
    // should fire an event such that a DiscordMessager and WebRelayer can deliver the reportable messages
    // (the messager classes should be responsible for creating the message string - this class only delivers the view-data)
    //
    // this might be time for the dispatcher
    throw new Error("TODO: Implement method of MultiplayerResultsDeliverer.");
  }
}
