import { Game } from "../../domain/game/game.entity";
import { GameEvent } from "./classes/game-event";
import { IGameEvent } from "./interfaces/game-event-interface";
import { GameEventType } from "./types/game-event-types";
import { TeamScoreCalculator } from "../classes/team-score-calculator";
import { VirtualMatch } from "../virtual-match/virtual-match";
import { constants } from "../../constants";
import { VirtualMatchKey } from "../virtual-match/virtual-match-key";
import _ = require("lodash"); // do not convert to default import -- it will break!!
import { sortByMatchOldestToLatest } from "../components/match";
import { Match } from "../../domain/match/match.entity";
import { IsValidBanchoMultiplayerIdConstraint } from "../../osu/validators/bancho-multiplayer-id.validator";
import { VirtualMatchCreator } from "../virtual-match/virtual-match-creator";
import { Log } from "../../utils/Log";
import { TeamID } from "../components/types/team-id";

/**
 * Team scored the lowest score in a virtual match
 *
 * @export
 * @class TeamScoredLowestGameEvent
 * @extends {GameEvent<{ teamId: TeamID }>}
 * @implements {GameEvent}
 */
export class TeamScoredLowestGameEvent extends GameEvent<{ teamId: TeamID }> implements IGameEvent {
  readonly type: GameEventType = "team_scored_lowest";

  newify() {
    return new TeamScoredLowestGameEvent();
  }

  happenedIn({
    targetVirtualMatch,
    game,
    allVirtualMatches
  }: {
    targetVirtualMatch: VirtualMatch;
    game: Game;
    allVirtualMatches: VirtualMatch[];
  }): boolean {
    // TODO: Write test for this event

    // To determine the lowest scoring alive team, we first need to exclude eliminated teams that have continued to play.
    // We need to parse the full history of the game in order to determine which teams have been eliminated thus far.

    const { losingTeamsForVirtualMatches, teamStatusForTargetVirtualMatch } = this.getLosingTeamsForVirtualMatches({
      targetVirtualMatch,
      allVirtualMatches,
      game
    });

    const losingTeamId = teamStatusForTargetVirtualMatch ? teamStatusForTargetVirtualMatch.losingTeamId : undefined;

    this.data = {
      // if teamId is undefined, it means there was no loser, probably because there was only one team remaining alive, or because teams tied
      teamId: losingTeamId,
      eventMatch: targetVirtualMatch,
      // the team lost at the time of the final lobby completing the map
      timeOfEvent: VirtualMatchCreator.getEstimatedTimeOfOccurrenceOfVirtualMatch(targetVirtualMatch)
    };

    return losingTeamId && losingTeamId > 0;
  }

  async after(): Promise<void> {
    // console.log(`Calling ${this.after.name} in ${this.constructor.name}`);
  }
}
