import { RequesterType } from "./requester-type";

export interface RequesterInfo {
  type: RequesterType;
  authorId?: string;
  originChannel?: string;
}
