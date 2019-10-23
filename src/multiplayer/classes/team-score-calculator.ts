import { VirtualMatch } from "../virtual-match/virtual-match";
import { Team } from "../../domain/team/team.entity";
import _ = require("lodash"); // do not convert to default import -- it will break!!
import { constants } from "../../constants";
import { Log } from "../../utils/Log";

interface CalculatedTeamScore {
  teamId: number;
  osuUserIds: number[];
  score: number;
}

export class TeamScoreCalculator {
  /**
   * Returns the ID of the Team entity of the winner of a virtual-match. Otherwise 0 if no winner.
   *
   * @static
   * @param {VirtualMatch} completedVirtualMatch
   * @param {CalculatedTeamScore[]} teamScores
   * @returns {number}
   * @memberof TeamScoreCalculator
   */
  static getWinningTeamIdOfVirtualMatch(completedVirtualMatch: VirtualMatch, teams: Team[]): number {
    // TODO: Handle tied scores
    // TODO: Logging
    if (!TeamScoreCalculator.isValidArgs(completedVirtualMatch, teams)) {
      return TeamScoreCalculator.getFalsyTeamId();
    }
    const calculatedTeamScores = TeamScoreCalculator.calculateTeamScoresForVirtualMatch(completedVirtualMatch, teams);
    if (!calculatedTeamScores || !calculatedTeamScores.length) {
      return TeamScoreCalculator.getFalsyTeamId();
    }
    const winningTeam = _(calculatedTeamScores).maxBy(ts => ts.score);
    if (!winningTeam) {
      return TeamScoreCalculator.getFalsyTeamId();
    }
    return winningTeam.teamId;
  }

  /**
   * Returns the ID of the Team entity of the loser of a virtual-match. Otherwise 0 if no loser.
   *
   * @static
   * @param {VirtualMatch} completedMap
   * @param {CalculatedTeamScore[]} teamScores
   * @returns {number}
   * @memberof TeamScoreCalculator
   */
  static calculateLowestScoringTeamIdOfVirtualMatch(completedVirtualMatch: VirtualMatch, teams: Team[]): number {
    // TODO: Handle tied scores
    // TODO: Logging
    if (!TeamScoreCalculator.isValidArgs(completedVirtualMatch, teams)) {
      return TeamScoreCalculator.getFalsyTeamId();
    }
    const calculatedTeamScores = TeamScoreCalculator.calculateTeamScoresForVirtualMatch(completedVirtualMatch, teams);
    if (!calculatedTeamScores || !calculatedTeamScores.length) {
      return TeamScoreCalculator.getFalsyTeamId();
    }
    const losingTeam = _(calculatedTeamScores).minBy(ts => ts.score);
    if (!losingTeam) {
      return TeamScoreCalculator.getFalsyTeamId();
    }
    return losingTeam.teamId;
  }

  private static isValidArgs(completedVirtualMatch: VirtualMatch, teams: Team[]) {
    return !(!completedVirtualMatch || !completedVirtualMatch.matches.length || !teams || !teams.length);
  }

  private static getFalsyTeamId(): number {
    return constants.MIN_ENTITY_ID_NUMBER - 1;
  }

  private static calculateTeamScoresForVirtualMatch(completedMap: VirtualMatch, teams: Team[]): CalculatedTeamScore[] {
    const teamScores: CalculatedTeamScore[] = [];

    if (teams.some(team => !team)) {
      Log.warn(`Undefined/falsy team in ${TeamScoreCalculator.name}. Possibly because no teams have been added for this game?`);
    }

    for (const match of completedMap.matches) {
      for (const playerScore of match.playerScores) {
        const osuUserId = playerScore.scoredBy.id;
        for (const team of teams) {
          if (!team) {
            continue;
          }
          const osuUserIds = team.teamOsuUsers.map(tou => tou.osuUser.id);
          if (osuUserIds.includes(osuUserId)) {
            let targetTeamScore = teamScores.find(ts => ts.teamId === team.id);
            if (!targetTeamScore) {
              teamScores.push({
                teamId: team.id,
                osuUserIds: osuUserIds,
                score: playerScore.score
              });
            } else {
              targetTeamScore.score += playerScore.score;
            }
          }
        }
      }
    }

    return teamScores;
  }
}
