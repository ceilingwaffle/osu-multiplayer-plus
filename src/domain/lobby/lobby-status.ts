import { ActionableGenericType } from "../../utils/actionable-generic-type";
import { LobbyStatusActionableType } from "./lobby-status-actionable-type";
import { LobbyStatusActionedType } from "./lobby-status-actioned-type";

export class LobbyStatus extends ActionableGenericType<LobbyStatusActionableType, LobbyStatusActionedType> {
  /** The lobby was added to at least one game, but no watcher has ever been started for this lobby. */
  static readonly AWAITING_FIRST_SCAN = new LobbyStatus("awaiting_first_scan", "Awaiting first scan", "started", ["watcher_startable"]);
  /**
   * Equivalent to the osu API lobby status.
   * e.g. if /api/get_match/match/end_time is null, the lobby is started (players can join) (started).
   */
  static readonly STARTED = new LobbyStatus("started", "Started", "started", ["watcher_not_startable"]);
  /**
   * Equivalent to the osu API lobby status.
   * e.g. if /api/get_match/match/end_time is not null, the lobby is closed (players cannot join) (ended).
   */
  static readonly ENDED = new LobbyStatus("ended", "Ended", "ended", ["watcher_not_startable"]);
  /** The lobby is currently being watched (was previously not being watched). */
  static readonly STARTED_WATCHING = new LobbyStatus("started_watching", "Started watching", "unknown", ["watcher_not_startable"]);
  /** The lobby is not currently being watched (was previously being watched). */
  static readonly STOPPED_WATCHING = new LobbyStatus("stopped_watching", "Stopped watching", "unknown", ["watcher_startable"]);
  /** The lobby status is unknown. Cannot start or unstart a watcher because we don't know what state the lobby is in. */
  static readonly UNKNOWN = new LobbyStatus("unknown", "Unknown", "unknown", []);

  static getLobbyStatusFromKey(key: string): LobbyStatus {
    return this.getStatusFromKey<LobbyStatus>(key);
  }

  // static isStartedStatus(statusKey: string): boolean {
  //   const status: LobbyStatus = LobbyStatus.getLobbyStatusFromKey(statusKey);
  //   return status.getActioned() === "started";
  // }

  // static isStoppedStatus(statusKey: string): boolean {
  //   const status: LobbyStatus = LobbyStatus.getLobbyStatusFromKey(statusKey);
  //   return status.getActioned() === "ended";
  // }
}
