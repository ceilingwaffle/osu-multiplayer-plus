// source: https://dev.to/krumpet/generic-type-guard-in-typescript-258l
type Constructor<T> = { new (...args: any[]): T };

class Dispatcher {
  events: { event: IEvent; handler: IEventHandler<IEvent> }[] = [];

  subscribe<E extends IEvent>(event: E, handler: IEventHandler<E>) {
    this.events.push({ event, handler });
  }

  dispatch(eventClass: Constructor<IEvent>) {
    console.log(`Dispatching event...`);

    this.events
      .filter(e => e.event instanceof eventClass)
      .forEach(e => {
        e.handler.handle(e.event);
      });
  }
}

interface IEvent {
  //   constructor: any;
  //   someRequiredProp: string;
  //   someOptionalProp?: string;
}

interface IEventHandler<E extends IEvent> {
  handle: (event: E) => void;
}

/** example concrete classes */
class LeaderboardReadyEvent implements IEvent {
  constructor(public winnerTeamId: number) {}
  someRequiredProp: string;
}

class SomeOtherEvent implements IEvent {
  constructor(public someString: string) {}
  someRequiredProp: string;
}

class SomePlainClass {}

class LeaderboardReadyHandler1 implements IEventHandler<LeaderboardReadyEvent> {
  handle(event: LeaderboardReadyEvent) {
    console.log(`Handler #1 handling LeaderboardReadyEvent with winnerTeamId ${event.winnerTeamId}`);
  }
}

class LeaderboardReadyHandler2 implements IEventHandler<LeaderboardReadyEvent> {
  handle(event: LeaderboardReadyEvent) {
    console.log(`Handler #2 handling LeaderboardReadyEvent with winnerTeamId ${event.winnerTeamId}`);
  }
}

class SomeOtherEventHandler implements IEventHandler<SomeOtherEvent> {
  handle(event: SomeOtherEvent) {
    console.log(`Handling SomeOtherEventHandler with someString ${event.someString}`);
  }
}

/** example implementation */
const dispatcher = new Dispatcher();
const lbeHandler1 = new LeaderboardReadyHandler1();
const lbeHandler2 = new LeaderboardReadyHandler2();
const lbrEvent1 = new LeaderboardReadyEvent(123);
const lbrEvent2 = new LeaderboardReadyEvent(456);
dispatcher.subscribe<LeaderboardReadyEvent>(lbrEvent1, lbeHandler1);
dispatcher.subscribe<LeaderboardReadyEvent>(lbrEvent1, lbeHandler2);
dispatcher.subscribe<LeaderboardReadyEvent>(lbrEvent2, lbeHandler1);
dispatcher.subscribe<SomeOtherEvent>(new SomeOtherEvent("my string"), new SomeOtherEventHandler());
dispatcher.dispatch(LeaderboardReadyEvent);
