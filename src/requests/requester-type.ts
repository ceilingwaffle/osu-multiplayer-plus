import { GenericType } from "../utils/generic-type";

export class RequesterType extends GenericType {
  static readonly DISCORD = new RequesterType("discord", null);
  static readonly WEB = new RequesterType("web", null);
}
