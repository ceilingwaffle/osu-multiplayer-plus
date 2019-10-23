import { VirtualMatch } from "../../virtual-match/virtual-match";

export type RequiredGameEventDataProps = {
  eventMatch: VirtualMatch;
  /** The timestamp of when the event happened */
  timeOfEvent: number;
};
