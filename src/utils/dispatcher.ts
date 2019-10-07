export interface Event<T extends EventName, D> extends EventData<D> {
  type: T;
}
interface EventData<D> {
  payload: D;
}
export type EventType = LeaderboardReadyEvent | FetchedNewOsuApiMultiplayerResults;
type Handler = (event: EventType) => boolean;
type EventHandlers = Set<Handler>;
interface IDispatcher {
  handlers: Map<EventName, EventHandlers>;
  subscribe(eventName: EventName, handler: Handler): void;
  dispatch(eventName: EventData<any>): void;
}

export class Dispatcher implements IDispatcher {
  handlers: Map<EventName, EventHandlers> = new Map<EventName, EventHandlers>();

  subscribe(eventName: EventName, handler: Handler): void {
    this.handlers.get(eventName) ? this.handlers.get(eventName).add(handler) : this.handlers.set(eventName, new Set<Handler>([handler]));
  }

  dispatch(event: EventType): void {
    for (const handlerFn of this.handlers.get(event.type)) {
      const handledResult = handlerFn(event);
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
  multiplayer: string;
}

type EventName = "LEADERBOARD_READY" | "FETCHED_NEW_OSU_API_MULTIPLAYER_RESULTS";

interface LeaderboardReadyEvent extends Event<"LEADERBOARD_READY", LeaderboardData> {}
interface FetchedNewOsuApiMultiplayerResults extends Event<"FETCHED_NEW_OSU_API_MULTIPLAYER_RESULTS", ApiMultiplayerData> {}

function leaderboardHandler1(event: EventType): boolean {
  console.log(`Calling leaderboardHandler1`, event);
  return true;
}

function leaderboardHandler2(event: EventType): boolean {
  console.log(`Calling leaderboardHandler2`, event);
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
