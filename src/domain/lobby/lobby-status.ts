import { GenericType } from "../../utils/generic-type";

export class LobbyStatus extends GenericType {
  static readonly AWAITING_FIRST_SCAN = new LobbyStatus("awaiting_first_scan", "Awaiting first scan");
  static readonly ACTIVE = new LobbyStatus("active", "Active");
  static readonly CLOSED = new LobbyStatus("closed", "Closed");
  static readonly UNKNOWN = new LobbyStatus("unknown", "Unknown");

  static getNotClosed(): string[] {
    return [LobbyStatus.AWAITING_FIRST_SCAN.getKey(), LobbyStatus.ACTIVE.getKey()];
  }
}
