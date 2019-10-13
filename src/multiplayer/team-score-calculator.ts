import { VirtualBeatmap } from "./virtual-beatmap";
import { Team } from "../domain/team/team.entity";
import _ = require("lodash"); // do not convert to default import -- it will break!!

export interface CalculatedTeamScore {
  teamId: number;
  osuUserIds: number[];
  score: number;
}

export class TeamScoreCalculator {
  static buildTeamScoresObject(teams: Team[]): CalculatedTeamScore[] {
    return _.map(teams, team => ({
      teamId: team.id,
      osuUserIds: team.teamOsuUsers.map(tou => tou.osuUser.id),
      score: 0
    }));
  }

  /**
   * Returns -1 if no winner, otherwise some positive number of the winning team ID
   *
   * @static
   * @param {VirtualBeatmap} completedMap
   * @param {CalculatedTeamScore[]} teamScores
   * @returns {number}
   * @memberof TeamScoreCalculator
   */
  static getWinningTeamIdOfVirtualBeatmap(completedMap: VirtualBeatmap, teamScores: CalculatedTeamScore[]): number {
    if (!completedMap || !completedMap.matches.length) {
      return -1;
    }

    if (!teamScores || !teamScores.length) {
      return -1;
    }

    // calculate team scores for each match
    for (const match of completedMap.matches) {
      for (const playerScore of match.playerScores) {
        const osuUserId = playerScore.scoredBy.id;
        for (const teamScore of teamScores) {
          if (teamScore.osuUserIds.includes(osuUserId)) {
            teamScore.score += playerScore.score;
          }
        }
      }
    }

    // determine winning team ID of last-completed beatmap
    const winningTeam = _(teamScores).maxBy(ts => ts.score);
    if (!winningTeam) {
      return -1;
    }

    return winningTeam.teamId;
  }
}
