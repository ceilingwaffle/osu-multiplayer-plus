import { Game } from "../../../domain/game/game.entity";
import { Log } from "../../../utils/Log";
import { IGameEvent } from "../interfaces/game-event-interface";
import _ = require("lodash"); // do not convert to default import -- it will break!!
import { VirtualMatch } from "../../virtual-match/virtual-match";

export class GameEventRegistrar {
  /**
   * A collection of GameEvents to be processed for this game.
   * (type = GameEventType)
   *
   * @type {{ [type: string]: IGameEvent }}
   */
  private events: { [type: string]: IGameEvent } = {};

  /**
   * Returns the game events listed in this registrar.
   *
   * @returns {IGameEvent[]}
   */
  getEvents(): IGameEvent[] {
    var values: IGameEvent[] = [];
    for (var prop in this.events) {
      if (this.events.hasOwnProperty(prop)) {
        values.push(this.events[prop]);
      }
    }
    return values;
  }

  /**
   * Registers a GameEvent to be processed (e.g. during the MultiplayerResultsProcessor process).
   * Should not be called from any class other than GameEventRegistrarCollection.
   * Register GameEvents via the GameEventRegistrarCollection singleton, otherwise the same event may be calculated multiple times.
   *
   * @param {...IGameEvent[]} events
   */
  register(...events: IGameEvent[]): void {
    for (const event of events) {
      if (this.events[event.type]) {
        Log.warn(`${event.constructor.name} with type '${event.type}' already registered in ${this.constructor.name}.`);
      }
      this.events[event.type] = event;
    }
  }

  // /**
  //  * Processes the given game data to determine if some event happened in that data,
  //  * and any additional actions defined in the event to be performed if the event did happen.
  //  *
  //  * @param {Game} game
  //  */
  // process(game: Game): void {
  //   for (const t in this.events) {
  //     const event = this.events[t];

  //     const completedVirtualMatches: VirtualMatch | VirtualMatch[] = getCompletedVirtualMatchesOfGameForGameEventType({
  //       eventType: event.type,
  //       game
  //     });

  //     if (event.happenedIn({ game, virtualMatches: completedVirtualMatches })) {
  //       if (event.after) event.after();
  //     }
  //   }
  // }
}
