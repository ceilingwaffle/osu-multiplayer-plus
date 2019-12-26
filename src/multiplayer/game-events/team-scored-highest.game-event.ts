import { Game } from "../../domain/game/game.entity";
import { GameEvent } from "./classes/game-event";
import { IGameEvent } from "./interfaces/game-event-interface";
import { GameEventType } from "./types/game-event-types";
import { TeamScoreCalculator } from "../classes/team-score-calculator";
import { VirtualMatch } from "../virtual-match/virtual-match";
import { constants } from "../../constants";
import { VirtualMatchCreator } from "../virtual-match/virtual-match-creator";

export class TeamScoredHighestGameEvent extends GameEvent<{ teamId: number }> implements IGameEvent {
  readonly type: GameEventType = "team_scored_highest";

  newify() {
    return new TeamScoredHighestGameEvent();
  }

  happenedIn({ targetVirtualMatch, game }: { targetVirtualMatch: VirtualMatch; game: Game }): boolean {
    // TODO: Write test for this event
    // console.log(`Calling ${this.happenedIn.name} in ${this.constructor.name}`);
    const teams = game.gameTeams.map(gt => gt.team);
    const winningTeamId = TeamScoreCalculator.getWinningTeamIdOfVirtualMatch(targetVirtualMatch, teams);
    if (winningTeamId < constants.MIN_ENTITY_ID_NUMBER) {
      return false;
    }
    this.data = {
      teamId: winningTeamId,
      eventMatch: targetVirtualMatch,
      // the team won at the time of the final lobby completing the map
      timeOfEvent: VirtualMatchCreator.getEstimatedTimeOfOccurrenceOfVirtualMatch(targetVirtualMatch),
      game: game
    };
    return true;
  }

  async after(): Promise<void> {
    // console.log(`Calling ${this.after.name} in ${this.constructor.name}`);
  }
}
