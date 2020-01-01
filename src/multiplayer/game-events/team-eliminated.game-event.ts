import { GameEvent } from "./classes/game-event";
import { IGameEvent } from "./interfaces/game-event-interface";
import { Game } from "../../domain/game/game.entity";
import { VirtualMatch } from "../virtual-match/virtual-match";
import _ = require("lodash"); // do not convert to default import -- it will break!!
import { VirtualMatchCreator } from "../virtual-match/virtual-match-creator";
import { GameEventType } from "./types/game-event-types";
import { Team } from "../../domain/team/team.entity";

export class TeamEliminatedGameEvent extends GameEvent<{ team: Team }> implements IGameEvent {
  type: GameEventType = "team_eliminated";

  newify() {
    return new TeamEliminatedGameEvent();
  }

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
    const allEliminatedTeamIdsForTarget = _.difference(
      teams.map(team => team.id),
      aliveTeamIdsForTarget
    );

    if (!allEliminatedTeamIdsForTarget.length) {
      this.data = {
        eventMatch: targetVirtualMatch,
        timeOfEvent: VirtualMatchCreator.getEstimatedTimeOfOccurrenceOfVirtualMatch(targetVirtualMatch),
        team: undefined,
        game: game
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
        team: teams.find(t => t.id === allEliminatedTeamIdsForTarget[0]),
        game: game
      };
      return true;
    }

    const aliveTeamIdsForPrevious = this.getAliveTeamIdsForTargetVirtualMatch(previousCompletedVirtualMatch, allVirtualMatches, game, teams); //prettier-ignore
    const justEliminatedTeamIdsForTarget = _.difference(aliveTeamIdsForPrevious, aliveTeamIdsForTarget);

    if (justEliminatedTeamIdsForTarget.length > 1) {
      throw new Error("No more than one team should be eliminated in a virtual match. This should never happen.");
    }

    const eliminatedTeamId = justEliminatedTeamIdsForTarget[0];

    if (!eliminatedTeamId) {
      this.data = {
        eventMatch: targetVirtualMatch,
        timeOfEvent: VirtualMatchCreator.getEstimatedTimeOfOccurrenceOfVirtualMatch(targetVirtualMatch),
        team: undefined,
        game: game
      };
      return false;
    }

    this.data = {
      eventMatch: targetVirtualMatch,
      timeOfEvent: VirtualMatchCreator.getEstimatedTimeOfOccurrenceOfVirtualMatch(targetVirtualMatch),
      team: teams.find(t => t.id === eliminatedTeamId),
      game: game
    };

    return true;
  }
}
