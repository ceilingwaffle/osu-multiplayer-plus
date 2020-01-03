import { IEvent } from "./event";
import { IEventHandler } from "./event-handler-interface";
import { Constructor } from "../../utils/constructor";

export interface IEventDispatcher {
  subscribe<E extends IEvent>(handler: IEventHandler<E>): void;
  dispatch(event: IEvent): Promise<void>;
  unsubscribe(eventClass: Constructor<IEvent>): void;
}
