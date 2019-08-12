import { GenericType } from "../../utils/generic-type";

export class GameStatus extends GenericType {
  static readonly SCHEDULED = new GameStatus("scheduled", "Scheduled");
  static readonly IDLE_NEWGAME = new GameStatus("idle_newgame", "Idle: Awaiting first lobby");
  static readonly INPROGRESS = new GameStatus("inprogress", "In Progress");
  static readonly COMPLETED = new GameStatus("completed", "Completed");
  static readonly MANUALLY_ENDED = new GameStatus("manually_ended", "Manually Ended");
  static readonly UNKNOWN = new GameStatus("unknown", "Unknown");

  static isEndable(statusKey: string) {
    switch (statusKey) {
      case GameStatus.COMPLETED.getKey():
        return false;
      default:
        return true;
    }
  }
}
