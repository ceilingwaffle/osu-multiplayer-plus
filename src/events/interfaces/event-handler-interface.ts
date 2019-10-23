import { IEvent } from "./event";

export interface IEventHandler<E extends IEvent> {
  handle: (event: E) => Promise<boolean>;
}
