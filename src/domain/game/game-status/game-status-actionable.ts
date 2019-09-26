import { GenericType } from "../../../utils/generic-type";
import { GameStatusActionedType } from "./game-status-actioned-type";
import { GameStatusActionableType } from "./game-status-actionable-type";

export abstract class GameStatusActionable extends GenericType {
  private actioned: GameStatusActionedType;
  private readonly actionable: GameStatusActionableType[];
  protected constructor(key: string, value: any, actioned: GameStatusActionedType, actionable: GameStatusActionableType[]) {
    super(key, value);
    this.actioned = actioned;
    this.actionable = actionable;
  }
  getActioned(): GameStatusActionedType {
    return this.actioned;
  }
  getActionables(): GameStatusActionableType[] {
    return this.actionable;
  }
}
