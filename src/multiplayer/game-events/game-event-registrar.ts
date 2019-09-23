import { Game } from "../../domain/game/game.entity";
import { Log } from "../../utils/Log";
import { GameEvent } from "./game-event";

export class GameEventRegistrar {
  /**
   * A collection of GameEvents to be processed for this game.
   * (type = GameEventType)
   *
   * @type {{ [type: string]: GameEvent }}
   */
  events: { [type: string]: GameEvent } = {};

  /**
   * Registers a GameEvent to be processed (e.g. during the MultiplayerResultsProcessor process).
   * Should not be called from any class other than GameEventRegistrarCollection.
   * Register GameEvents via the GameEventRegistrarCollection singleton, otherwise the same event may be calculated multiple times.
   *
   * @param {...GameEvent[]} events
   */
  register(...events: GameEvent[]): void {
    for (const event of events) {
      if (this.events[event.type]) {
        Log.warn(`${event.constructor.name} with type '${event.type}' already registered in ${this.constructor.name}.`);
      }
      this.events[event.type] = event;
    }
  }

  /**
   * Processes the given game data to determine if some event happened in that data,
   * and any additional actions defined in the event to be performed if the event did happen.
   *
   * @param {Game} game
   */
  process(game: Game): void {
    for (const t in this.events) {
      const event = this.events[t];
      if (event.happenedIn(game)) {
        if (event.after) event.after();
      }
    }
  }
}
