import { Game } from "../../../domain/game/game.entity";
import { AbstractGameEvent } from "../abstract-game-event";
import { GameEvent } from "../game-event";
import { GameEventType } from "../game-event-types";

export class TeamWonGameEvent extends AbstractGameEvent<{ teamId: number }> implements GameEvent {
  readonly type: GameEventType = "team_won";

  happenedIn(game: Game): boolean {
    console.log(`Calling ${this.happenedIn.name} in ${this.constructor.name}`);
    // TODO: did this event happen in the game data?
    // yes - build this events data, return true
    // no - return false
    const winningTeamId = 1;
    this.data = { teamId: winningTeamId };
    return true;
  }

  after(): void {
    console.log(`Calling ${this.after.name} in ${this.constructor.name}`);
  }
}
