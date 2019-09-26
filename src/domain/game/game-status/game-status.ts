import { GenericType } from "../../../utils/generic-type";
import { GameStatusActionable } from "./game-status-actionable";

export class GameStatus extends GameStatusActionable {
  static readonly UNKNOWN = new GameStatus("unknown", "Unknown", "unknown", []);

  // created (i.e. after the user has created the game and no lobby scanner has been started)
  static readonly SCHEDULED = new GameStatus("scheduled", "Scheduled", "created", ["startable", "endable"]);
  static readonly IDLE_NEWGAME = new GameStatus("idle_newgame", "Idle: Awaiting first lobby", "created", ["startable", "endable"]);

  // started (i.e. when a lobby scanner has been started - even if no match results have been received yet)
  static readonly INPROGRESS = new GameStatus("inprogress", "In Progress", "started", ["endable"]);

  // ended (i.e. when the game is over, lobby scanners stopped, and its state is probably frozen)
  static readonly COMPLETED = new GameStatus("completed", "Completed", "ended", []);
  static readonly MANUALLY_ENDED = new GameStatus("manually_ended", "Manually Ended", "ended", []);

  static isStartedStatus(statusKey: string): boolean {
    const status: GameStatus = GameStatus.getGameStatusFromKey(statusKey);
    return status.getActioned() === "started";
  }

  static isEndedStatus(statusKey: string): boolean {
    const status: GameStatus = GameStatus.getGameStatusFromKey(statusKey);
    return status.getActioned() === "ended";
  }

  static isNewGameStatus(statusKey: string): boolean {
    const status: GameStatus = GameStatus.getGameStatusFromKey(statusKey);
    return status.getActioned() === "created";
  }

  static isStartable(statusKey: string): boolean {
    const status: GameStatus = GameStatus.getGameStatusFromKey(statusKey);
    return status.getActionables().includes("startable");
  }

  static isEndable(statusKey: string): boolean {
    const status: GameStatus = GameStatus.getGameStatusFromKey(statusKey);
    return status.getActionables().includes("endable");
  }

  private static getGameStatusFromKey(key: string): GameStatus {
    const theseProps = Object.values(this) as Array<GenericType>;
    const found: GameStatus[] = theseProps.filter(prop => prop.getKey() === key) as GameStatus[];

    if (found.length < 1) {
      throw new Error("Key not found.");
    }
    if (found.length > 1) {
      throw new Error("Multiple keys found?? This should never happen...");
    }

    return found[0];
  }
}
