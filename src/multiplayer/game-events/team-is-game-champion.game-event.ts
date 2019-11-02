import { GameEvent } from "./classes/game-event";
import { IGameEvent } from "./interfaces/game-event-interface";
import { GameEventType } from "./types/game-event-types";
import { Game } from "../../domain/game/game.entity";
import { VirtualMatch } from "../virtual-match/virtual-match";
import { VirtualMatchCreator } from "../virtual-match/virtual-match-creator";

export class TeamIsGameChampionGameEvent extends GameEvent<{ teamId: number }> implements IGameEvent {
  type: GameEventType = "team_game_champion_declared";

  happenedIn({
    game,
    targetVirtualMatch,
    allVirtualMatches
  }: {
    game: Game;
    targetVirtualMatch: VirtualMatch;
    allVirtualMatches: VirtualMatch[];
  }): boolean {
    // if virtual match incomplete, no team scores are ready yet for this virtual match
    if (targetVirtualMatch.lobbies.remaining.length) return false;
    if (!game || !game.gameTeams || !game.gameTeams.length) return false;

    const teams = game.gameTeams.map(gt => gt.team);
    if (!teams.length) return false;

    // a team wins a game when it is the only team with greater than 0 lives remaining
    const { losingTeamsForVirtualMatches, teamStatusForTargetVirtualMatch } = this.getLosingTeamsForVirtualMatches({
      targetVirtualMatch,
      allVirtualMatches,
      game
    });

    const teamLives = this.getCurrentTeamLivesForVirtualMatches(game, teams, losingTeamsForVirtualMatches);
    const aliveTeamIds = Array.from(teamLives).filter(t => t[1].lives > 0).map(t => t[0]); //prettier-ignore
    const winnerTeamId: number = aliveTeamIds.length === 1 ? aliveTeamIds[0] : undefined;

    this.data = {
      eventMatch: targetVirtualMatch,
      timeOfEvent: VirtualMatchCreator.getEstimatedTimeOfOccurrenceOfVirtualMatch(targetVirtualMatch),
      teamId: winnerTeamId
    };

    return !!winnerTeamId;
  }
}
