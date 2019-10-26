import { Game } from "../../domain/game/game.entity";
import { GameEvent } from "./classes/game-event";
import { IGameEvent } from "./interfaces/game-event-interface";
import { GameEventType } from "./types/game-event-types";
import { TeamScoreCalculator } from "../classes/team-score-calculator";
import { VirtualMatch } from "../virtual-match/virtual-match";
import { constants } from "../../constants";
import { VirtualMatchKey } from "../virtual-match/virtual-match-key";
import _ = require("lodash"); // do not convert to default import -- it will break!!
import { sortByMatchOldestToLatest } from "../components/match";
import { Match } from "../../domain/match/match.entity";
import { IsValidBanchoMultiplayerIdConstraint } from "../../osu/validators/bancho-multiplayer-id.validator";
import { VirtualMatchCreator } from "../virtual-match/virtual-match-creator";
import { Log } from "../../utils/Log";

/**
 * Team scored the lowest score in a virtual match
 *
 * @export
 * @class TeamScoredLowestGameEvent
 * @extends {GameEvent<{ teamId: number }>}
 * @implements {GameEvent}
 */
export class TeamScoredLowestGameEvent extends GameEvent<{ teamId: number }> implements IGameEvent {
  readonly type: GameEventType = "team_scored_lowest";

  happenedIn({
    targetVirtualMatch,
    game,
    allVirtualMatches
  }: {
    targetVirtualMatch: VirtualMatch;
    game: Game;
    allVirtualMatches: VirtualMatch[];
  }): boolean {
    // TODO: Write test for this event

    // To determine the lowest scoring alive team, we first need to exclude eliminated teams that have continued to play.
    // We need to parse the full history of the game in order to determine which teams have been eliminated thus far.

    // console.log(`Calling ${this.happenedIn.name} in ${this.constructor.name}`);

    const startingLives = game.teamLives;
    const teams = game.gameTeams.map(gt => gt.team);

    // we'll use these cloned teams to remove teams as we determine them to be eliminated
    let teamsRemovingEliminated = _.cloneDeep(teams);

    const targetVmCopy = _.cloneDeep(targetVirtualMatch);
    targetVmCopy.matches.sort((m1, m2) => this.compareFnMatchesOldestToLatest(m1, m2)).slice(-1)[0];
    const targetVmLatestMatch = targetVmCopy.matches.slice(-1)[0];

    const virtualMatchesSorted = _(allVirtualMatches)
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

    // create Map with team ID as key
    const teamLosses: Map<number, { lossCount: number; eliminated: boolean }> = new Map();

    // mark teams as eliminated one by one
    const losingTeamsForVirtualMatches = _(virtualMatchesSorted).reduce(
      (vmTeamScoresAccumulator, virtualMatch, _i, _list) => {
        if (teamsRemovingEliminated.length < 2) {
          Log.debug("Only one team remains alive. Game should be ended now.");
          return vmTeamScoresAccumulator;
        }
        const lowestScoringTeamIds = TeamScoreCalculator.calculateLowestScoringTeamIdsOfVirtualMatch(virtualMatch, teamsRemovingEliminated);
        if (!lowestScoringTeamIds || lowestScoringTeamIds.length < 1) {
          return vmTeamScoresAccumulator;
        }
        const lowestScoringTeamId = lowestScoringTeamIds[0];
        if (lowestScoringTeamIds.length === 1) {
          vmTeamScoresAccumulator.set(
            VirtualMatchCreator.createSameBeatmapKeyString({
              beatmapId: virtualMatch.beatmapId,
              sameBeatmapNumber: virtualMatch.sameBeatmapNumber
            }),
            { losingTeamId: lowestScoringTeamId, tiedScore: false }
          );
        } else {
          // tied scores means no team loses a life
          vmTeamScoresAccumulator.set(
            VirtualMatchCreator.createSameBeatmapKeyString({
              beatmapId: virtualMatch.beatmapId,
              sameBeatmapNumber: virtualMatch.sameBeatmapNumber
            }),
            { losingTeamId: undefined, tiedScore: true }
          );
          return vmTeamScoresAccumulator;
        }

        // update loss count for the losing team
        let losingTeamRecords = teamLosses.get(lowestScoringTeamId);
        if (!losingTeamRecords) {
          teamLosses.set(lowestScoringTeamId, { lossCount: 1, eliminated: game.teamLives <= 1 });
          losingTeamRecords = teamLosses.get(lowestScoringTeamId);
        } else {
          losingTeamRecords.lossCount++;
          losingTeamRecords.eliminated = losingTeamRecords.lossCount >= startingLives;
        }

        // remove losing team from teams array if they are eliminated
        if (losingTeamRecords.eliminated) {
          teamsRemovingEliminated = teamsRemovingEliminated.filter(team => team.id !== lowestScoringTeamId);
        }

        return vmTeamScoresAccumulator;
      },
      // virtualMatchKey, value
      new Map<string, { losingTeamId: number; tiedScore: boolean }>()
    );

    // determine the losing team ID of the target virtual match
    const teamStatusForTargetVirtualMatch = losingTeamsForVirtualMatches.get(
      VirtualMatchCreator.createSameBeatmapKeyString({
        beatmapId: targetVirtualMatch.beatmapId,
        sameBeatmapNumber: targetVirtualMatch.sameBeatmapNumber
      })
    );
    const losingTeamId = teamStatusForTargetVirtualMatch ? teamStatusForTargetVirtualMatch.losingTeamId : undefined;

    this.data = {
      // if teamId is undefined, it means there was no loser, probably because there was only one team remaining alive, or because teams tied
      teamId: losingTeamId,
      eventMatch: targetVirtualMatch,
      // the team lost at the time of the final lobby completing the map
      timeOfEvent: this.getTimeOfLatestMatch(this.getLatestMatchFromVirtualMatch(targetVirtualMatch))
    };

    return losingTeamId && losingTeamId > 0;
  }

  private compareFnMatchesOldestToLatest(m1: Match, m2: Match): number {
    if (!m1.endTime && m2.endTime) {
      return m1.endTime - m2.endTime;
    }
    if (!m1.startTime && m2.startTime) {
      return m1.startTime - m2.startTime;
    }
    return m1.id - m2.id;
  }

  after(): void {
    console.log(`Calling ${this.after.name} in ${this.constructor.name}`);
  }
}
