import { GameEvent } from "./classes/game-event";
import { IGameEvent } from "./interfaces/game-event-interface";
import { Game } from "../../domain/game/game.entity";
import { VirtualMatch } from "../virtual-match/virtual-match";
import _ = require("lodash"); // do not convert to default import -- it will break!!
import { VirtualMatchCreator } from "../virtual-match/virtual-match-creator";
import { GameEventType } from "./types/game-event-types";

export class TeamEliminatedGameEvent extends GameEvent<{ teamId: number }> implements IGameEvent {
  type: GameEventType = "team_eliminated";

  happenedIn({
    game,
    targetVirtualMatch,
    allVirtualMatches
  }: {
    game: Game;
    targetVirtualMatch: VirtualMatch;
    allVirtualMatches?: VirtualMatch[];
  }): boolean {
    // if virtual match incomplete, no team scores are ready yet for this virtual match
    if (targetVirtualMatch.lobbies.remaining.length) return false;
    if (!game || !game.gameTeams || !game.gameTeams.length) return false;

    const teams = game.gameTeams.map(gt => gt.team);
    if (!teams.length) return false;

    const aliveTeamIdsForTarget = this.getAliveTeamIdsForTargetVirtualMatch(targetVirtualMatch, allVirtualMatches, game, teams);
    const allEliminatedTeamIdsForTarget = _.difference(teams.map(team => team.id), aliveTeamIdsForTarget);

    if (!allEliminatedTeamIdsForTarget.length) {
      this.data = {
        eventMatch: targetVirtualMatch,
        timeOfEvent: VirtualMatchCreator.getEstimatedTimeOfOccurrenceOfVirtualMatch(targetVirtualMatch),
        teamId: undefined
      };
      return false;
    }

    // get virtual match before target
    const targetVirtualMatchTime = VirtualMatchCreator.getEstimatedTimeOfOccurrenceOfVirtualMatch(targetVirtualMatch);
    const previousCompletedVirtualMatch = allVirtualMatches
      .filter(vm => {
        if (vm.lobbies.remaining.length) return false;
        const possiblePreviousVirtualMatchTime = VirtualMatchCreator.getEstimatedTimeOfOccurrenceOfVirtualMatch(vm);
        return (
          possiblePreviousVirtualMatchTime <= targetVirtualMatchTime &&
          !VirtualMatchCreator.isEquivalentVirtualMatchByKey(vm, targetVirtualMatch)
        );
      })
      .slice(-1)[0];

    // handle special cases where we don't need to know the previous virtual match to determine if a team was eliminated
    const firstVirtualMatch = allVirtualMatches.slice(0, 1)[0];
    if (
      !previousCompletedVirtualMatch ||
      (allVirtualMatches.length === 1 && teams.length === 2 && allEliminatedTeamIdsForTarget.length === 1) ||
      VirtualMatchCreator.isEquivalentVirtualMatchByKey(targetVirtualMatch, firstVirtualMatch)
    ) {
      this.data = {
        eventMatch: targetVirtualMatch,
        timeOfEvent: VirtualMatchCreator.getEstimatedTimeOfOccurrenceOfVirtualMatch(targetVirtualMatch),
        teamId: allEliminatedTeamIdsForTarget[0]
      };
      return true;
    }

    const aliveTeamIdsForPrevious = this.getAliveTeamIdsForTargetVirtualMatch(previousCompletedVirtualMatch, allVirtualMatches, game, teams); //prettier-ignore
    const justEliminatedTeamIdsForTarget = _.difference(aliveTeamIdsForPrevious, aliveTeamIdsForTarget);

    if (justEliminatedTeamIdsForTarget.length > 1) {
      throw new Error("No more than one team should be eliminated in a virtual match. This should never happen.");
    }

    const eliminatedTeamId = justEliminatedTeamIdsForTarget[0];

    this.data = {
      eventMatch: targetVirtualMatch,
      timeOfEvent: VirtualMatchCreator.getEstimatedTimeOfOccurrenceOfVirtualMatch(targetVirtualMatch),
      teamId: eliminatedTeamId
    };

    return true;
  }
}
