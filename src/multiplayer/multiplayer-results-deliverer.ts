import { injectable, inject } from "inversify";
import TYPES from "../types";
import { IEventDispatcher } from "../utils/event-dispatcher";
import { ReportableContext, ReportableContextType } from "../domain/game/game-match-reported.entity";

@injectable()
export class MultiplayerResultsDeliverer {
  constructor(@inject(TYPES.IEventDispatcher) protected dispatcher: IEventDispatcher) {}

  async deliver(args: { reportables: ReportableContext<ReportableContextType>[] }): Promise<boolean> {
    // should fire an event such that a DiscordMessager and WebRelayer can deliver the reportable messages
    // (the messager classes should be responsible for creating the message string - this class only delivers the view-data)
    //
    // this might be time for the dispatcher

    // this.dispatcher.dispatch(new event with payload)

    throw new Error("TODO: Implement method of MultiplayerResultsDeliverer.");
  }
}
