import { VirtualMatch } from "../../virtual-match/virtual-match";
import _ = require("lodash"); // do not convert to default import -- it will break!!
import { Match } from "../../../domain/match/match.entity";
import { CustomGameEventDataProps } from "../types/custom-game-event-data-props";

export abstract class GameEvent<DataType> {
  data: CustomGameEventDataProps<DataType>;
}
