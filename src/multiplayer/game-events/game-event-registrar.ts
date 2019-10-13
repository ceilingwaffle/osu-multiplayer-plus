import { Game } from "../../domain/game/game.entity";
import { Log } from "../../utils/Log";
import { GameEvent, getCompletedVirtualBeatmapsOfGameForGameEventType } from "./game-event";
import _ = require("lodash"); // do not convert to default import -- it will break!!
import { VirtualBeatmap } from "../virtual-beatmap";

export class GameEventRegistrar {
  /**
   * A collection of GameEvents to be processed for this game.
   * (type = GameEventType)
   *
   * @type {{ [type: string]: GameEvent }}
   */
  private events: { [type: string]: GameEvent } = {};

  /**
   * Returns the game events listed in this registrar.
   *
   * @returns {GameEvent[]}
   */
  getEvents(): GameEvent[] {
    var values: GameEvent[] = [];
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

      const completedVirtualBeatmaps: VirtualBeatmap | VirtualBeatmap[] = getCompletedVirtualBeatmapsOfGameForGameEventType({
        eventType: event.type,
        game
      });

      if (event.happenedIn({ game, virtualBeatmaps: completedVirtualBeatmaps })) {
        if (event.after) event.after();
      }
    }
  }
}
