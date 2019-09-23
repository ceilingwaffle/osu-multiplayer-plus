import { GameEventData } from "./game-event-data";

export abstract class AbstractGameEvent<DataType> implements GameEventData {
  data: DataType;
}
