import { VirtualMatch } from "../../virtual-match/virtual-match";
import _ = require("lodash"); // do not convert to default import -- it will break!!
import { Match } from "../../../domain/match/match.entity";
import { CustomGameEventDataProps } from "../types/custom-game-event-data-props";
import { Game } from "../../../domain/game/game.entity";
import { TeamID } from "../../components/types/team-id";
import { Log } from "../../../utils/Log";
import { TeamScoreCalculator } from "../../classes/team-score-calculator";
import { VirtualMatchCreator } from "../../virtual-match/virtual-match-creator";
import { Team } from "../../../domain/team/team.entity";

type LosingTeamsMapData = { losingTeamId: number; tiedScore: boolean; team: Team };
type VirtualMatchKeyString = string;
type LosingTeamsMap = Map<VirtualMatchKeyString, LosingTeamsMapData>;

export abstract class GameEvent<DataType> {
  data: CustomGameEventDataProps<DataType>;

  protected getLosingTeamsForVirtualMatches(args: {
    targetVirtualMatch: VirtualMatch;
    allVirtualMatches: VirtualMatch[];
    game: Game;
  }): { losingTeamsForVirtualMatches: LosingTeamsMap; teamStatusForTargetVirtualMatch: LosingTeamsMapData } {
    const targetVmCopy = _.cloneDeep(args.targetVirtualMatch);
    targetVmCopy.matches.sort((m1, m2) => this.compareFnMatchesOldestToLatest(m1, m2)).slice(-1)[0];
    const targetVmLatestMatch = targetVmCopy.matches.slice(-1)[0];

    const startingLives = args.game.teamLives;
    const teams = args.game.gameTeams.map(gt => gt.team);
    const virtualMatchesSorted = this.getVirtualMatchesSorted(args.allVirtualMatches, targetVmLatestMatch);

    // create Map with team ID as key
    const teamLosses: Map<TeamID, { losses: number; eliminated: boolean }> = new Map<TeamID, { losses: number; eliminated: boolean }>();

    // we'll use these cloned teams to remove teams as we determine them to be eliminated
    let teamsRemovingEliminated = _.cloneDeep(teams);

    let debugLoggedOnce = false;
    const losingTeamsForVirtualMatches: LosingTeamsMap = _(virtualMatchesSorted).reduce(
      (vmTeamScoresAccumulator, virtualMatch, _i, _list) => {
        // mark teams as eliminated one by one
        if (teamsRemovingEliminated.length < 2) {
          if (!debugLoggedOnce) {
            Log.debug(`Only one team remains alive. Game should be ended now. Game ID ${args.game.id}.`);
            debugLoggedOnce = true;
          }
          return vmTeamScoresAccumulator;
        }
        const lowestScoringTeamIds = TeamScoreCalculator.calculateLowestScoringTeamIdsOfVirtualMatch(virtualMatch, teamsRemovingEliminated);
        if (!lowestScoringTeamIds || lowestScoringTeamIds.length < 1) {
          return vmTeamScoresAccumulator;
        }
        const lowestScoringTeamId = lowestScoringTeamIds[0];
        const team: Team = teamsRemovingEliminated.find(t => t.id === lowestScoringTeamId);
        if (lowestScoringTeamIds.length === 1) {
          vmTeamScoresAccumulator.set(
            VirtualMatchCreator.createSameBeatmapKeyString({
              beatmapId: virtualMatch.beatmapId,
              sameBeatmapNumber: virtualMatch.sameBeatmapNumber
            }),
            { losingTeamId: lowestScoringTeamId, tiedScore: false, team }
          );
        } else {
          // tied scores means no team loses a life
          vmTeamScoresAccumulator.set(
            VirtualMatchCreator.createSameBeatmapKeyString({
              beatmapId: virtualMatch.beatmapId,
              sameBeatmapNumber: virtualMatch.sameBeatmapNumber
            }),
            { losingTeamId: undefined, tiedScore: true, team }
          );
          return vmTeamScoresAccumulator;
        }

        // update loss count for the losing team
        let losingTeamRecords = teamLosses.get(lowestScoringTeamId);
        if (!losingTeamRecords) {
          teamLosses.set(lowestScoringTeamId, { losses: 1, eliminated: args.game.teamLives <= 1 });
          losingTeamRecords = teamLosses.get(lowestScoringTeamId);
        } else {
          losingTeamRecords.losses++;
          losingTeamRecords.eliminated = losingTeamRecords.losses >= startingLives;
        }

        // remove losing team from teams array if they are eliminated
        if (losingTeamRecords.eliminated) {
          teamsRemovingEliminated = teamsRemovingEliminated.filter(team => team.id !== lowestScoringTeamId);
        }

        return vmTeamScoresAccumulator;
      },
      // virtualMatchKey, value
      new Map<string, LosingTeamsMapData>()
    );

    // determine the losing team ID of the target virtual match
    const teamStatusForTargetVirtualMatch = losingTeamsForVirtualMatches.get(
      VirtualMatchCreator.createSameBeatmapKeyString({
        beatmapId: args.targetVirtualMatch.beatmapId,
        sameBeatmapNumber: args.targetVirtualMatch.sameBeatmapNumber
      })
    );

    return { losingTeamsForVirtualMatches, teamStatusForTargetVirtualMatch };
  }

  protected getVirtualMatchesSorted(allVirtualMatches: VirtualMatch[], targetVmLatestMatch: Match) {
    return _(allVirtualMatches)
      .cloneDeep()
      .filter(vm => {
        // remove any virtual matches occurring after the target virtual match
        const vmLatestMatch = vm.matches.sort((m1, m2) => this.compareFnMatchesOldestToLatest(m1, m2)).slice(-1)[0];
        return this.compareFnMatchesOldestToLatest(vmLatestMatch, targetVmLatestMatch) <= 0;
      })
      .sort((vm1, vm2) => {
        // const vm1LatestMatch = vm1.matches.sort((m1, m2) => this.compareFnMatchesOldestToLatest(m1, m2)).slice(-1)[0];
        // const vm2LatestMatch = vm2.matches.sort((m1, m2) => this.compareFnMatchesOldestToLatest(m1, m2)).slice(-1)[0];
        const vm1LatestMatch = vm1.matches.slice(-1)[0];
        const vm2LatestMatch = vm2.matches.slice(-1)[0];
        return this.compareFnMatchesOldestToLatest(vm1LatestMatch, vm2LatestMatch);
      });
  }

  protected compareFnMatchesOldestToLatest(m1: Match, m2: Match): number {
    if (!m1.endTime && m2.endTime) {
      return m1.endTime - m2.endTime;
    }
    if (!m1.startTime && m2.startTime) {
      return m1.startTime - m2.startTime;
    }
    return m1.id - m2.id;
  }

  protected getCurrentTeamLivesForVirtualMatches(
    game: Game,
    teams: Team[],
    losingTeamsForVirtualMatches: Map<string, { losingTeamId: number; tiedScore: boolean }>
  ): Map<TeamID, { lives: number }> {
    const startingLives = game.teamLives;
    const teamLivesTally = new Map<TeamID, { lives: number }>();
    teams.forEach(team => teamLivesTally.set(team.id, { lives: startingLives }));
    losingTeamsForVirtualMatches.forEach(losingTeamsData => {
      const teamId = losingTeamsData.losingTeamId;
      const teamLives = teamLivesTally.get(teamId);
      if (!teamLives) return;
      if (teamLives.lives > 0) teamLives.lives--;
    });
    return teamLivesTally;
  }

  protected getAliveTeamIdsForTargetVirtualMatch(
    targetVirtualMatch: VirtualMatch,
    allVirtualMatches: VirtualMatch[],
    game: Game,
    teams: Team[]
  ) {
    // filter out any vms occurring after the target
    const targetTime = VirtualMatchCreator.getEstimatedTimeOfOccurrenceOfVirtualMatch(targetVirtualMatch);
    const completedVirtualMatchesBeforeTarget = allVirtualMatches.filter(vm => {
      if (vm.lobbies.remaining.length) return false;
      const vmTime = VirtualMatchCreator.getEstimatedTimeOfOccurrenceOfVirtualMatch(vm);
      return vmTime <= targetTime;
    });

    const { losingTeamsForVirtualMatches, teamStatusForTargetVirtualMatch } = this.getLosingTeamsForVirtualMatches({
      targetVirtualMatch,
      allVirtualMatches: completedVirtualMatchesBeforeTarget,
      game
    });
    const teamLives = this.getCurrentTeamLivesForVirtualMatches(game, teams, losingTeamsForVirtualMatches);
    const aliveTeamIds = Array.from(teamLives).filter(t => t[1].lives > 0).map(t => t[0]); //prettier-ignore
    return aliveTeamIds;
  }
}
