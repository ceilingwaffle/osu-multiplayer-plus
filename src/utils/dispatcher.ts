export interface Event<EventName, EventDataType> {
  type: EventName;
  payload: EventDataType;
}
type Handler<E extends Event<E["type"], E["payload"]>> = (eventType: E["type"], eventData: E["payload"]) => boolean;
type EventHandlers<E extends Event<E["type"], E["payload"]>> = Set<Handler<E>>;

// interface IDispatcher<EventName, EventData> {
//   handlers: Map<EventName, EventHandlers<EventName, EventData>>;
//   subscribe(eventName: EventName, handler: Handler<EventName, EventData>): void;
//   dispatch(event: Event<EventName, EventData>): void;
// }

export class Dispatcher<E extends Event<E["type"], E["payload"]>> {
  handlers: Map<E["type"], EventHandlers<E>> = new Map<E["type"], Set<Handler<E>>>();

  subscribe(eventName: E["type"], handler: Handler<E>): void {
    this.handlers.get(eventName) ? this.handlers.get(eventName).add(handler) : this.handlers.set(eventName, new Set<Handler<E>>([handler]));
  }

  dispatch(event: Event<E["type"], E["payload"]>): void {
    for (const handlerFn of this.handlers.get(event.type)) {
      const handledResult = handlerFn(event.type, event.payload);
      if (!handledResult) {
        break;
      }
    }
  }
}
// -----------------------------------
interface LeaderboardData {
  leaderboard: string;
}
interface ApiMultiplayerData {
  multiplayer: number;
}

type EventName = "LEADERBOARD_READY" | "FETCHED_NEW_OSU_API_MULTIPLAYER_RESULTS";
export type EventType = LeaderboardReadyEvent | FetchedNewOsuApiMultiplayerResults;

interface LeaderboardReadyEvent extends Event<"LEADERBOARD_READY", LeaderboardData> {}
interface FetchedNewOsuApiMultiplayerResults extends Event<"FETCHED_NEW_OSU_API_MULTIPLAYER_RESULTS", ApiMultiplayerData> {}

function leaderboardHandler1(event: EventName, payload: LeaderboardData): boolean {
  console.log(`Calling leaderboardHandler1`, { event, payload });
  console.warn(payload.leaderboard);
  return true;
}

function leaderboardAndMpResultsHandler1(event: EventName, payload: ApiMultiplayerData): boolean {
  console.log(`Calling leaderboardAndMpResultsHandler`, { event, payload });
  return true;
}

function leaderboardAndMpResultsHandler2(event: EventName, payload: LeaderboardData): boolean {
  console.log(`Calling leaderboardAndMpResultsHandler2`, { event, payload });
  return true;
}

function mpResultsHandler1(event: EventName, payload: ApiMultiplayerData): boolean {
  console.log(`Calling mpResultsHandler`, { event, payload });
  return true;
}

function mpResultsHandler2(): boolean {
  console.log(`Calling mpResultsHandler (has no event arg)`);
  return true;
}
const d = new Dispatcher<EventType>();
d.subscribe("LEADERBOARD_READY", leaderboardHandler1);
d.subscribe("LEADERBOARD_READY", leaderboardAndMpResultsHandler1);
d.subscribe("FETCHED_NEW_OSU_API_MULTIPLAYER_RESULTS", leaderboardAndMpResultsHandler2);
d.subscribe("FETCHED_NEW_OSU_API_MULTIPLAYER_RESULTS", leaderboardHandler1); // TODO: should complain :( -
d.subscribe("FETCHED_NEW_OSU_API_MULTIPLAYER_RESULTS", mpResultsHandler1);
d.subscribe("FETCHED_NEW_OSU_API_MULTIPLAYER_RESULTS", mpResultsHandler2);
d.dispatch({ type: "LEADERBOARD_READY", payload: { leaderboard: "my leaderboard data" } });
d.dispatch({ type: "FETCHED_NEW_OSU_API_MULTIPLAYER_RESULTS", payload: { multiplayer: 12345 } });

// handler payload type (ApiMultiplayerData) should match event.type (E["type"])

// in dispatch() when calling the handler, the event with type E['type'] should have E["payload"] type
