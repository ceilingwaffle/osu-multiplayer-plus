import { IEvent } from "../interfaces/event";
import { IEventHandler } from "../interfaces/event-handler-interface";
import { Constructor } from "../../utils/Constructor";

export abstract class EventHandler<E extends IEvent> implements IEventHandler<E> {
  constructor(public eventClass: Constructor<E>) {}
  abstract handle(event: E): Promise<boolean>;
}
