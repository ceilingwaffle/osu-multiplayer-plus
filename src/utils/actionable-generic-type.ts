import { GenericType } from "./generic-type";

export abstract class ActionableGenericType<ActionableType, ActionedType> extends GenericType {
  private readonly actioned: ActionedType;
  private readonly actionable: ActionableType[];

  protected constructor(key: string, value: any, actioned: ActionedType, actionable: ActionableType[]) {
    super(key, value);
    this.actioned = actioned;
    this.actionable = actionable;
  }

  getActioned(): ActionedType {
    return this.actioned;
  }

  getActionables(): ActionableType[] {
    return this.actionable;
  }
}
