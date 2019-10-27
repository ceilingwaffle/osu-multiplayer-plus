import { VirtualMatch } from "../../virtual-match/virtual-match";
import _ = require("lodash"); // do not convert to default import -- it will break!!
import { Match } from "../../../domain/match/match.entity";
import { CustomGameEventDataProps } from "../types/custom-game-event-data-props";

export abstract class GameEvent<DataType> {
  data: CustomGameEventDataProps<DataType>;

  /** We want the time of this event to be equal to the end-time of the match that ended most recently (or start-time if the match has no end-time) */
  protected getLatestMatchFromVirtualMatch(targetVirtualMatch: VirtualMatch) {
    return _.sortBy<Match>(targetVirtualMatch.matches, ["endTime", "startTime", "id"]).reverse().slice(-1)[0]; //prettier-ignore
  }

  /** Use the current system time if there are no matches, or if the match has no defined endTime or startTime */
  protected getTimeOfLatestMatch(latestTimeMatch: Match): number {
    return latestTimeMatch ? latestTimeMatch.endTime || latestTimeMatch.startTime || Date.now() : Date.now();
  }

  protected getEventTimeOfVirtualMatch(virtualMatch: VirtualMatch): number {
    return this.getTimeOfLatestMatch(this.getLatestMatchFromVirtualMatch(virtualMatch));
  }
}
