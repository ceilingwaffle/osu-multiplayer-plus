import { Game } from "../../../domain/game/game.entity";
import { AbstractGameEvent } from "../abstract-game-event";
import { GameEvent } from "../game-event";
import { GameEventType } from "../game-event-types";
import { TeamScoreCalculator } from "../../team-score-calculator";
import { VirtualMatch } from "../../virtual-match";
import { constants } from "../../../constants";

export class TeamLostVirtualMatchGameEvent extends AbstractGameEvent<{ teamId: number }> implements GameEvent {
  readonly type: GameEventType = "team_lost_match";

  happenedIn({ targetVirtualMatch, game }: { targetVirtualMatch: VirtualMatch; game: Game }): boolean {
    // TODO: Write test for this event
    // console.log(`Calling ${this.happenedIn.name} in ${this.constructor.name}`);
    const teams = game.gameTeams.map(gt => gt.team);
    const losingTeamId = TeamScoreCalculator.getLosingTeamIdOfVirtualMatch(targetVirtualMatch, teams);
    if (losingTeamId < constants.MIN_ENTITY_ID_NUMBER) {
      return false;
    }
    this.data = {
      teamId: losingTeamId,
      eventMatch: targetVirtualMatch,
      // the team lost at the time of the final lobby completing the map
      timeOfEvent: this.getTimeOfLatestMatch(this.getLatestMatchFromVirtualMatch(targetVirtualMatch))
    };
    return true;
  }

  after(): void {
    console.log(`Calling ${this.after.name} in ${this.constructor.name}`);
  }
}
