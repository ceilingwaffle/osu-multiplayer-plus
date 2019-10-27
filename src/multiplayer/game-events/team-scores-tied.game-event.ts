import { GameEvent } from "./classes/game-event";
import { IGameEvent } from "./interfaces/game-event-interface";
import { GameEventType } from "./types/game-event-types";
import { Game } from "../../domain/game/game.entity";
import { VirtualMatch } from "../virtual-match/virtual-match";
import { TeamScoreCalculator } from "../classes/team-score-calculator";
import { TeamID } from "../components/types/team-id";

type TiedTeamsData = { score: number; tiedWithTeamIds: TeamID[] };
export type TiedTeamsDataMap = Map<TeamID, TiedTeamsData>;

export class TeamScoresTiedGameEvent extends GameEvent<{ data: TiedTeamsDataMap }> implements IGameEvent {
  type: GameEventType = "team_scores_tied";

  happenedIn({ game, targetVirtualMatch }: { game: Game; targetVirtualMatch: VirtualMatch }): boolean {
    // if virtual match incomplete, no team scores are ready yet for this virtual match
    if (targetVirtualMatch.lobbies.remaining.length) return false;
    if (!game || !game.gameTeams || !game.gameTeams.length) return false;

    const teams = game.gameTeams.map(gt => gt.team);
    if (teams.length < 2) return false;

    const teamScores = TeamScoreCalculator.calculateTeamScoresForVirtualMatch(targetVirtualMatch, teams);
    if (!teamScores || !teamScores.length) return false;

    this.data = {
      eventMatch: targetVirtualMatch,
      timeOfEvent: this.getEventTimeOfVirtualMatch(targetVirtualMatch),
      data: new Map<TeamID, TiedTeamsData>()
    };

    for (const teamScore of teamScores) {
      // check for tied team scores
      const matchingTeamScores = teamScores.filter(ts => ts.score === teamScore.score && ts.teamId !== teamScore.teamId);
      if (!matchingTeamScores.length) {
        continue;
      }
      const tiedWithTeamIds = matchingTeamScores.map(ts => ts.teamId);
      this.data.data.set(teamScore.teamId, { score: teamScore.score, tiedWithTeamIds });
    }

    return !!this.data.data.size;
  }
}
