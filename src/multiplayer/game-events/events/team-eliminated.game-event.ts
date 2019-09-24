import { AbstractGameEvent } from "../abstract-game-event";
import { GameEvent } from "../game-event";
import { GameEventType } from "../game-event-types";

export class TeamEliminatedGameEvent extends AbstractGameEvent<{ teamId: number }> implements GameEvent {
  readonly type: GameEventType = "team_eliminated";

  happenedIn(): boolean {
    console.log(`Calling ${this.happenedIn.name} in ${this.constructor.name}`);
    // TODO: did this event happen in the game data?
    // yes - build the data, attach the data to this event object, return true
    // no - return false
    const eliminatedTeamId = 1;
    this.data = { teamId: eliminatedTeamId };
    return true;
  }
}
