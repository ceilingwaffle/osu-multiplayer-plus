import { Game } from "../../domain/game/game.entity";
import { GameEvent } from "./classes/game-event";
import { IGameEvent } from "./interfaces/game-event-interface";
import { GameEventType } from "./types/game-event-types";
import { TeamScoreCalculator } from "../classes/team-score-calculator";
import { VirtualMatch } from "../virtual-match/virtual-match";
import { constants } from "../../constants";

/**
 * Team scored the lowest score in a virtual match
 *
 * @export
 * @class TeamScoredLowestGameEvent
 * @extends {GameEvent<{ teamId: number }>}
 * @implements {GameEvent}
 */
export class TeamScoredLowestGameEvent extends GameEvent<{ teamId: number }> implements IGameEvent {
  readonly type: GameEventType = "team_scored_lowest";

  happenedIn({ targetVirtualMatch, game }: { targetVirtualMatch: VirtualMatch; game: Game }): boolean {
    // TODO: Write test for this event
    // console.log(`Calling ${this.happenedIn.name} in ${this.constructor.name}`);
    const teams = game.gameTeams.map(gt => gt.team);
    const losingTeamId = TeamScoreCalculator.calculateLowestScoringTeamIdOfVirtualMatch(targetVirtualMatch, teams);
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
