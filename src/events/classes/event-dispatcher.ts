import { Log } from "../../utils/log";
import { injectable } from "inversify";
import { IEvent } from "../interfaces/event";
import { EventHandler } from "./event-handler";
import { IEventDispatcher } from "../interfaces/event-dispatcher";
import { Constructor } from "../../utils/Constructor";

@injectable()
export class EventDispatcher implements IEventDispatcher {
  /**
   * All handlers in each array of handlers run asynchronously (at the same time).
   * Handlers in each array will be executed only if every handler in the previous array succeeded.
   *
   * @type {Set<EventHandler<IEvent>[]>}
   */
  asyncEventHandlers: Set<EventHandler<IEvent>[]> = new Set<EventHandler<IEvent>[]>();

  /**
   * Subscribes handlers to handle events asyncronously.
   * If any handler in the group fails, any subsequent subscribed-handlers will not run.
   * Execute multiple calls to subscribe() in the order that each group of event handlers should be executed.
   *
   * @template E
   * @param {...EventHandler<E>[]} handlers
   * @returns {boolean}
   */
  subscribe<E extends IEvent>(...handlers: EventHandler<E>[]): void {
    const sizeBefore = this.asyncEventHandlers.size;
    const afterAdding = this.asyncEventHandlers.add(handlers);
    const addedCount = afterAdding.size - sizeBefore;
    if (addedCount < 1) {
      handlers.forEach(handler => {
        throw new Error(`Failed to subscribe event handler ${handler.constructor.name}.`);
      });
    }
    for (const handler of handlers) {
      Log.info(`Subscribed event handler ${handler.constructor.name}.`);
    }
  }

  async dispatch(event: IEvent): Promise<void> {
    Log.info(`Dispatching event ${event.constructor.name}...`);
    const sameEventHandlerGroups = Array.from(this.asyncEventHandlers).map(sameEventHandlers =>
      sameEventHandlers.filter(handler => handler.eventClass.name === event.constructor.name)
    );
    handlerGroupLoop: for (const sameEventHandlers of sameEventHandlerGroups) {
      const handlers = sameEventHandlers.map(handler => ({
        handler: handler,
        eventClass: handler.eventClass,
        handleFn: handler.handle
      }));
      const results = await Promise.all(handlers.map(handler => handler.handleFn(event)));
      for (const [i, result] of results.entries()) {
        const handle = handlers[i];
        if (!result) {
          Log.info(
            `Failed to handle ${handle.eventClass.name} with handler ${handle.handler.constructor.name}. Halting subsequent events.`
          );
          break handlerGroupLoop;
        }
        Log.info(`Handled event ${handle.eventClass.name} with handler ${handle.handler.constructor.name}.`);
      }
    }
  }

  // unsubscribe(eventClass: Constructor<IEvent>): boolean {
  //   const event = Array.from(this.eventHandlers).find(handler => handler.eventClass instanceof eventClass); // TODO: Fix this
  //   if (!event) {
  //     throw new Error(`Cannot unsubscribe event ${eventClass.name} because it is not subscribed.`);
  //   }
  //   const result = this.eventHandlers.delete(event);
  //   if (!result) {
  //     throw new Error(`Error trying to unsubscribe event ${event.constructor.name}.`);
  //   }
  //   Log.info(`Unsubscribed event ${event.constructor.name}.`);
  //   return result;
  // }

  unsubscribe(eventClass: Constructor<IEvent>): void {
    throw new Error("Method not implemented.");
  }
}

// /** example concrete classes */
// class LeaderboardReadyEvent implements IEvent {
//   constructor(public winnerTeamId: number) {}
// }

// class SomeOtherEvent implements IEvent {
//   constructor(public someString: string) {}
// }

// class SomePlainClass {}

// class DiscordLeaderboardDeliverer extends EventHandler<LeaderboardReadyEvent> {
//   async handle(event: LeaderboardReadyEvent): Promise<boolean> {
//     Log.info(`Delivering LeaderboardReadyEvent to Discord - winnerTeamId ${event.winnerTeamId}`);
//     return new Promise(async (resolve, reject) => {
//       try {
//         setTimeout(() => {
//           Log.debug("Success DiscordLeaderboardDeliverer");
//           return resolve(true);
//         }, Helpers.getRandomInt(300, 800));
//       } catch (error) {
//         return reject(error);
//       }
//     });
//   }
// }

// class WebLeaderboardDeliverer extends EventHandler<LeaderboardReadyEvent> {
//   async handle(event: LeaderboardReadyEvent): Promise<boolean> {
//     Log.info(`Delivering LeaderboardReadyEvent to Web - winnerTeamId ${event.winnerTeamId}`);
//     return new Promise(async (resolve, reject) => {
//       try {
//         setTimeout(() => {
//           const shouldRandomlyFail = Helpers.getRandomInt(1, 2) === 1 ? true : false;
//           if (shouldRandomlyFail) {
//             Log.warn("Failing WebLeaderboardDeliverer");
//             return resolve(false);
//           } else {
//             Log.debug("Success WebLeaderboardDeliverer");
//             return resolve(true);
//           }
//         }, Helpers.getRandomInt(300, 800));
//       } catch (error) {
//         return reject(error);
//       }
//     });
//   }
// }

// class LeaderboardDeliveredLogger extends EventHandler<LeaderboardReadyEvent> {
//   async handle(event: LeaderboardReadyEvent): Promise<boolean> {
//     Log.info(`Logging delivery success of LeaderboardReadyEvent with winnerTeamId ${event.winnerTeamId}`);
//     return new Promise(async (resolve, reject) => {
//       try {
//         setTimeout(() => {
//           Log.debug("Success LeaderboardDeliveredLogger");
//           return resolve(true);
//         }, Helpers.getRandomInt(300, 800));
//       } catch (error) {
//         return reject(error);
//       }
//     });
//   }
// }

// class SomeOtherEventHandler extends EventHandler<SomeOtherEvent> {
//   async handle(event: SomeOtherEvent): Promise<boolean> {
//     Log.info(`Handling SomeOtherEventHandler with someString ${event.someString}`);
//     return new Promise(async (resolve, reject) => {
//       try {
//         setTimeout(() => {
//           return resolve(true);
//         }, Helpers.getRandomInt(300, 800));
//       } catch (error) {
//         return reject(error);
//       }
//     });
//   }
// }

// setTimeout(async () => {
//   /** example implementation */
//   const dispatcher = new EventDispatcher();
//   dispatcher.subscribe<LeaderboardReadyEvent>(
//     new WebLeaderboardDeliverer(LeaderboardReadyEvent),
//     new DiscordLeaderboardDeliverer(LeaderboardReadyEvent)
//   );
//   // TODO: re-think if this is what we really want. Logger will not execute if web deliverer fails.
//   dispatcher.subscribe<LeaderboardReadyEvent>(new LeaderboardDeliveredLogger(LeaderboardReadyEvent));
//   dispatcher.subscribe<SomeOtherEvent>(new SomeOtherEventHandler(SomeOtherEvent));
//   // await Promise.all([dispatcher.dispatch(new LeaderboardReadyEvent(111)), dispatcher.dispatch(new LeaderboardReadyEvent(222))]);
//   await dispatcher.dispatch(new LeaderboardReadyEvent(111));
//   // await dispatcher.dispatch(new LeaderboardReadyEvent(222));
//   // dispatcher.dispatch(new SomeOtherEvent("abc123"));
// }, 1);
