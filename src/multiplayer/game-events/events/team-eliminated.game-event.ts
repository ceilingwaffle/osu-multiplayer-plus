import { AbstractGameEvent } from "../abstract-game-event";
import { GameEvent } from "../game-event";
import { GameEventType } from "../game-event-types";
import { VirtualMatch } from "../../virtual-match";
import { Game } from "../../../domain/game/game.entity";

export class TeamEliminatedGameEvent extends AbstractGameEvent<{ teamId: number; eventMatch: VirtualMatch }> implements GameEvent {
  readonly type: GameEventType = "team_eliminated";

  happenedIn({ targetVirtualMatch, game }: { targetVirtualMatch: VirtualMatch; game: Game }): boolean {
    throw new Error("TODO: Implement method of TeamEliminatedGameEvent.");
    // console.log(`Calling ${this.happenedIn.name} in ${this.constructor.name}`);
    // TODO: did this event happen in the game data?
    // yes - build the data, attach the data to this event object, return true
    // no - return false
    const eliminatedTeamId = 1;
    // this.data = { teamId: eliminatedTeamId };
    return true;
  }
}
