import { Log } from "./log";

export interface IEvent {
  //   constructor: any;
  //   someRequiredProp: string;
  //   someOptionalProp?: string;
}

export interface IEventHandler<E extends IEvent> {
  handle: (event: E) => void;
}

// source: https://dev.to/krumpet/generic-type-guard-in-typescript-258l
type Constructor<T> = { new (...args: any[]): T };

interface EventAndHandler {
  event: IEvent;
  handler: IEventHandler<IEvent>;
}

export class Dispatcher {
  events: Set<EventAndHandler> = new Set<EventAndHandler>();

  subscribe<E extends IEvent>(event: E, handler: IEventHandler<E>): boolean {
    const sizeBefore = this.events.size;
    const sizeAfter = this.events.add({ event, handler }).size;
    const result = sizeAfter > sizeBefore;
    if (!result) {
      throw new Error(`Failed to subscribe event ${event.constructor.name} with handler ${handler.constructor.name}.`);
    }
    Log.info(`Subscribed event ${event.constructor.name} with handler ${handler.constructor.name}.`);
    return result;
  }

  dispatch(eventClass: Constructor<IEvent>): void {
    Log.info(`Dispatching event ${eventClass.name}...`);
    Array.from(this.events)
      .filter(e => e.event instanceof eventClass)
      .forEach(e => {
        e.handler.handle(e.event);
        Log.info(`Handled event ${e.event.constructor.name} with handler ${e.handler.constructor.name}.`);
      });
  }

  unsubscribe(eventClass: Constructor<IEvent>): boolean {
    const event = Array.from(this.events).find(e => e.event instanceof eventClass);
    if (!event) {
      throw new Error(`Cannot unsubscribe event ${eventClass.name} because it is not subscribed.`);
    }
    const result = this.events.delete(event);
    if (!result) {
      throw new Error(`Error trying to unsubscribe event ${event.constructor.name}.`);
    }
    Log.info(`Unsubscribed event ${event.constructor.name}.`);
    return result;
  }
}

/** example concrete classes */
// class LeaderboardReadyEvent implements IEvent {
//   constructor(public winnerTeamId: number) {}
//   someRequiredProp: string;
// }

// class SomeOtherEvent implements IEvent {
//   constructor(public someString: string) {}
//   someRequiredProp: string;
// }

// class SomePlainClass {}

// class LeaderboardReadyHandler1 implements IEventHandler<LeaderboardReadyEvent> {
//   handle(event: LeaderboardReadyEvent) {
//     Log.info(`Handler #1 handling LeaderboardReadyEvent with winnerTeamId ${event.winnerTeamId}`);
//   }
// }

// class LeaderboardReadyHandler2 implements IEventHandler<LeaderboardReadyEvent> {
//   handle(event: LeaderboardReadyEvent) {
//     Log.info(`Handler #2 handling LeaderboardReadyEvent with winnerTeamId ${event.winnerTeamId}`);
//   }
// }

// class SomeOtherEventHandler implements IEventHandler<SomeOtherEvent> {
//   handle(event: SomeOtherEvent) {
//     Log.info(`Handling SomeOtherEventHandler with someString ${event.someString}`);
//   }
// }

// /** example implementation */
// const dispatcher = new Dispatcher();
// const lbeHandler1 = new LeaderboardReadyHandler1();
// const lbeHandler2 = new LeaderboardReadyHandler2();
// const lbrEvent1 = new LeaderboardReadyEvent(123);
// const lbrEvent2 = new LeaderboardReadyEvent(456);
// dispatcher.subscribe<LeaderboardReadyEvent>(lbrEvent1, lbeHandler1);
// dispatcher.subscribe<LeaderboardReadyEvent>(lbrEvent1, lbeHandler2);
// dispatcher.subscribe<LeaderboardReadyEvent>(lbrEvent2, lbeHandler1);
// dispatcher.subscribe<SomeOtherEvent>(new SomeOtherEvent("my string"), new SomeOtherEventHandler());
// dispatcher.dispatch(LeaderboardReadyEvent);
