import { GameEventRegistrar } from "./game-event-registrar";
import { injectable } from "inversify";
import { IGameEvent } from "../interfaces/game-event-interface";
import { Log } from "../../../utils/Log";

/**
 * Collection of GameEventRegistrars and GameEvents.
 * Designed to be a singleton instance managed by the inversify DIC.
 *
 * @export
 * @class GameEventRegistrarCollection
 */
@injectable()
export class GameEventRegistrarCollection {
  constructor() {
    Log.info(`Initialized ${this.constructor.name}.`);
  }

  /**
   * The Game Event Registrars
   *
   * @type {{ [gameId: number]: GameEventRegistrar }}
   */
  registrars: { [gameId: number]: GameEventRegistrar } = {};

  // /**
  //  * A pool of game events shared between registrars.
  //  * (type = GameEventType)
  //  *
  //  * @type {{ [type: string]: GameEvent }}
  //  */
  // events: { [type: string]: GameEvent } = {};

  /**
   * Finds or creates a GameEventRegistrar for the given game ID.
   *
   * @param {number} gameId
   * @returns {GameEventRegistrar}
   */
  findOrCreate(gameId: number): GameEventRegistrar {
    if (!gameId || gameId < 0) throw new Error("Game ID must be defined and greater than 0 to register game events.");
    if (!this.registrars[gameId]) {
      this.registrars[gameId] = new GameEventRegistrar();
    }
    return this.registrars[gameId];
  }

  /**
   * Add new game events to the registrar. Events should be created for each registrar, not passed by reference
   * (because the event.data property will contain different data depending on the game it's registered to).
   *
   * @param {GameEventRegistrar} registrar
   * @param {...IGameEvent[]} gameEvents
   */
  registerGameEventsOnRegistrar(registrar: GameEventRegistrar, ...gameEvents: IGameEvent[]): void {
    registrar.register(...gameEvents);
    // NOTE: old referenced "events from a pool of seen events" code:
    //      for (const eventToBeRegistered of gameEvents) {
    //           const seenEvents = this.getEvents();
    //           if (!seenEvents.map(e => e.type).includes(eventToBeRegistered.type)) {
    //             Log.info(`Saving previously unseen-event ${eventToBeRegistered.constructor.name} (type ${eventToBeRegistered.type})`);
    //             this.events[eventToBeRegistered.type] = eventToBeRegistered;
    //           } else {
    //             Log.info(`Reusing previously seen-event ${eventToBeRegistered.constructor.name} (type ${eventToBeRegistered.type})`);
    //           }
    //           registrar.register(this.events[eventToBeRegistered.type]);
    //      }
  }

  // /**
  //  * Returns the game events listed in this collection.
  //  *
  //  * @returns {GameEvent[]}
  //  */
  // getEvents(): GameEvent[] {
  //   var values: GameEvent[] = [];
  //   for (var prop in this.events) {
  //     if (this.events.hasOwnProperty(prop)) {
  //       values.push(this.events[prop]);
  //     }
  //   }
  //   return values;
  // }
}
