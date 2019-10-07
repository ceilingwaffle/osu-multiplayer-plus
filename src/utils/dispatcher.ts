export interface Event<EventName, D> extends EventData<D> {
  type: EventName;
}
interface EventData<D> {
  payload: D;
}
type Handler<EventName, EventData> = (eventType: EventName, eventData: EventData) => boolean;
type EventHandlers<EventName, EventData> = Set<Handler<EventName, EventData>>;

interface IDispatcher<EventName, EventData> {
  handlers: Map<EventName, EventHandlers<EventName, EventData>>;
  subscribe(eventName: EventName, handler: Handler<EventName, EventData>): void;
  dispatch(event: Event<EventName, EventData>): void;
}

export class Dispatcher<EventName, EventData> implements IDispatcher<EventName, EventData> {
  handlers: Map<EventName, EventHandlers<EventName, EventData>> = new Map<EventName, EventHandlers<EventName, EventData>>();

  subscribe(eventName: EventName, handler: Handler<EventName, EventData>): void {
    this.handlers.get(eventName)
      ? this.handlers.get(eventName).add(handler)
      : this.handlers.set(eventName, new Set<Handler<EventName, EventData>>([handler]));
  }

  dispatch(event: Event<EventName, EventData>): void {
    for (const handlerFn of this.handlers.get(event.type)) {
      const handledResult = handlerFn(event.type, event.payload);
      if (!handledResult) {
        break;
      }
    }
  }
}
// -----------------------------------

export type EventType = LeaderboardReadyEvent | FetchedNewOsuApiMultiplayerResults;

interface LeaderboardData {
  leaderboard: string;
}
interface ApiMultiplayerData {
  multiplayer: string;
}

type EventName = "LEADERBOARD_READY" | "FETCHED_NEW_OSU_API_MULTIPLAYER_RESULTS";

interface LeaderboardReadyEvent extends Event<"LEADERBOARD_READY", LeaderboardData> {}
interface FetchedNewOsuApiMultiplayerResults extends Event<"FETCHED_NEW_OSU_API_MULTIPLAYER_RESULTS", ApiMultiplayerData> {}

function leaderboardHandler1(event: EventName, payload: EventData<LeaderboardData>): boolean {
  console.log(`Calling leaderboardHandler1`, { event, payload });
  return true;
}

function leaderboardHandler2(event: EventType, payload: EventData<LeaderboardData>): boolean {
  console.log(`Calling leaderboardHandler2`, { event, payload });
  return true;
}

function mpResultsHandler1(): boolean {
  console.log(`Calling mpResultsHandler1 (has no event arg)`);
  return true;
}

const d = new Dispatcher();
d.subscribe("LEADERBOARD_READY", leaderboardHandler1);
d.subscribe("LEADERBOARD_READY", leaderboardHandler2);
d.subscribe("FETCHED_NEW_OSU_API_MULTIPLAYER_RESULTS", mpResultsHandler1);
d.dispatch({ type: "LEADERBOARD_READY", payload: { leaderboard: "my leaderboard data" } });
d.dispatch({ type: "FETCHED_NEW_OSU_API_MULTIPLAYER_RESULTS", payload: { multiplayer: "my multiplayer data" } });
