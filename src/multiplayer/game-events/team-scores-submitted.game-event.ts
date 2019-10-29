import { GameEvent } from "./classes/game-event";
import { IGameEvent } from "./interfaces/game-event-interface";
import { GameEventType } from "./types/game-event-types";
import { Game } from "../../domain/game/game.entity";
import { VirtualMatch } from "../virtual-match/virtual-match";
import { TeamScoreCalculator, CalculatedTeamScore } from "../classes/team-score-calculator";
import { TeamID } from "../components/types/team-id";
import { VirtualMatchCreator } from "../virtual-match/virtual-match-creator";

type VirtualMatchData = { submitted: boolean; score?: number };
export type TeamVirtualMatchDataMap = Map<TeamID, VirtualMatchData>;

export class TeamScoresSubmittedGameEvent extends GameEvent<{ data: TeamVirtualMatchDataMap }> implements IGameEvent {
  type: GameEventType = "team_scores_submitted";

  happenedIn({ game, targetVirtualMatch }: { game: Game; targetVirtualMatch: VirtualMatch }): boolean {
    // if virtual match incomplete, no team scores are ready yet for this virtual match
    if (targetVirtualMatch.lobbies.remaining.length) return false;
    if (!game || !game.gameTeams || !game.gameTeams.length) return false;

    const teams = game.gameTeams.map(gt => gt.team);
    if (!teams.length) return false;

    const teamScores: CalculatedTeamScore[] = TeamScoreCalculator.calculateTeamScoresForVirtualMatch(targetVirtualMatch, teams);
    if (!teamScores || !teamScores.length) return false;

    this.data = {
      eventMatch: targetVirtualMatch,
      timeOfEvent: VirtualMatchCreator.getEstimatedTimeOfOccurrenceOfVirtualMatch(targetVirtualMatch),
      data: new Map<TeamID, VirtualMatchData>()
    };

    teamScores
      .sort((a, b) => b.score - a.score)
      .forEach(teamScore => {
        this.data.data.set(teamScore.teamId, {
          submitted: true,
          score: teamScore.score
        });
      });

    teams.forEach(team => {
      const teamSubmittedScore = teamScores.find(teamScore => teamScore.teamId === team.id);
      // if some team is missing a score, it means the team did not submit a score
      if (!teamSubmittedScore) {
        this.data.data.set(team.id, {
          submitted: false
        });
      }
    });

    return !!this.data.data.size;
  }
}
