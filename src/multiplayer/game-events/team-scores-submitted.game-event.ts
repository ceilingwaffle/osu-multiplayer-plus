import { GameEvent } from "./classes/game-event";
import { IGameEvent } from "./interfaces/game-event-interface";
import { GameEventType } from "./types/game-event-types";
import { Game } from "../../domain/game/game.entity";
import { VirtualMatch } from "../virtual-match/virtual-match";
import { TeamScoreCalculator } from "../classes/team-score-calculator";
import { TeamID } from "../components/types/team-id";

type VirtualMatchData = { score: number; rank: number };
export type TeamVirtualMatchDataMap = Map<TeamID, VirtualMatchData>;

export class TeamScoresSubmittedGameEvent extends GameEvent<{ data: TeamVirtualMatchDataMap }> implements IGameEvent {
  type: GameEventType = "team_scores_submitted";

  happenedIn({ game, targetVirtualMatch }: { game: Game; targetVirtualMatch: VirtualMatch }): boolean {
    // if virtual match incomplete, no team scores are ready yet for this virtual match
    if (targetVirtualMatch.lobbies.remaining.length) return false;
    if (!game || !game.gameTeams || !game.gameTeams.length) return false;

    const teams = game.gameTeams.map(gt => gt.team);
    if (!teams.length) return false;

    const teamScores = TeamScoreCalculator.calculateTeamScoresForVirtualMatch(targetVirtualMatch, teams);
    if (!teamScores || !teamScores.length) return false;

    this.data = {
      eventMatch: targetVirtualMatch,
      timeOfEvent: this.getEventTimeOfVirtualMatch(targetVirtualMatch),
      data: new Map<TeamID, VirtualMatchData>()
    };

    teamScores
      .sort((a, b) => b.score - a.score)
      .forEach((teamScore, i) => {
        // if teams scored the same score, they get the same rank.
        // e.g. T1: scored 100 (rank 1), T2: scored 100 (rank 1), T3: scored 99 (rank 3)
        const identicalScore = Array.from(this.data.data).find(d => d[1].score === teamScore.score);
        const rank = identicalScore ? identicalScore[1].rank : i + 1;
        this.data.data.set(teamScore.teamId, { score: teamScore.score, rank: rank });
      });

    return !!this.data.data.size;
  }
}
