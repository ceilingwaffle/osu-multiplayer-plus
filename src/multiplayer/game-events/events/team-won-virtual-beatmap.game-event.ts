import { Game } from "../../../domain/game/game.entity";
import { AbstractGameEvent } from "../abstract-game-event";
import { GameEvent } from "../game-event";
import { GameEventType } from "../game-event-types";
import _ = require("lodash"); // do not convert to default import -- it will break!!
import { CalculatedTeamScore, TeamScoreCalculator } from "../../team-score-calculator";
import { VirtualMatch } from "../../virtual-match";

export class TeamWonVirtualMatchGameEvent extends AbstractGameEvent<{ teamId: number }> implements GameEvent {
  readonly type: GameEventType = "team_won_match";

  happenedIn({ game, virtualMatches }: { game: Game; virtualMatches: VirtualMatch }): boolean {
    console.log(`Calling ${this.happenedIn.name} in ${this.constructor.name}`);

    const latestCompletedVirtualMatch: VirtualMatch = virtualMatches;
    if (!latestCompletedVirtualMatch) {
      return false;
    }

    const teams = game.gameTeams.map(gt => gt.team);
    const teamScores: CalculatedTeamScore[] = TeamScoreCalculator.buildTeamScoresObject(teams);

    // const allCompletedMaps = BeatmapLobbyGrouper.buildBeatmapsGroupedByLobbyPlayedStatusesForGame(game);
    // const latestCompletedMap = BeatmapLobbyGrouper.getLatestBeatmapCompletedByAllLobbiesForGame(game);

    const winningTeamId = TeamScoreCalculator.getWinningTeamIdOfVirtualMatch(latestCompletedVirtualMatch, teamScores);
    if (winningTeamId < 1) {
      return false;
    }

    this.data = { teamId: winningTeamId };

    // TODO: Write test for this
    return true;
  }

  after(): void {
    console.log(`Calling ${this.after.name} in ${this.constructor.name}`);
  }
}
