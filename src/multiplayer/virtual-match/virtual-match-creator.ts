import { VirtualMatch } from "./virtual-match";
import { Match } from "../../domain/match/match.entity";
import _ = require("lodash"); // do not convert to default import -- it will break!!
import { Lobby } from "../../domain/lobby/lobby.entity";
import { Log } from "../../utils/Log";
import { Game } from "../../domain/game/game.entity";
import { VirtualMatchKey } from "./virtual-match-key";
import { sortByMatchOldestToLatest } from "../components/match";
import { LobbyBeatmapStatusMessageBuilder } from "../messages/classes/lobby-beatmap-status-message-builder";
import { ApiMatch } from "../../osu/types/api-match";

export class VirtualMatchCreator {
  // /**
  //  * Returns a list of virtual matches for all virtual matches completed in this game so far,
  //  * and only those virtual matches not containing a real match that we've already delivered a game report for.
  //  *
  //  * @static
  //  * @param {Game} game
  //  * @param {Match[]} reportedMatches
  //  * @returns {VirtualMatch[]}
  //  */
  // static buildCompletedVirtualMatchesForGameForUnreportedMatches({
  //   game,
  //   reportedMatches
  // }: {
  //   game: Game;
  //   reportedMatches: Match[];
  // }): VirtualMatch[] {
  //   const allVirtualMatches = VirtualMatchCreator.buildVirtualMatchesForGame(game);
  //   const completedVirtualMatches = VirtualMatchCreator.removeIncompleteVirtualMatches(allVirtualMatches);
  //   const completedAndUnreported = VirtualMatchCreator.removeVirtualMatchesContainingRealMatches({
  //     virtualMatches: completedVirtualMatches,
  //     realMatches: reportedMatches
  //   });
  //   return completedAndUnreported;
  // }

  // static buildAllVirtualMatchesForGameForUnreportedMatches({
  //   game,
  //   reportedMatches
  // }: {
  //   game: Game;
  //   reportedMatches: Match[];
  // }): VirtualMatch[] {
  //   const allVirtualMatches = VirtualMatchCreator.buildVirtualMatchesForGame(game);
  //   const allUnreportedVirtualMatches = VirtualMatchCreator.removeVirtualMatchesContainingRealMatches({
  //     virtualMatches: allVirtualMatches,
  //     realMatches: reportedMatches
  //   });
  //   return allUnreportedVirtualMatches;
  // }

  /**
   * Returns a list of beatmaps each containing lists of lobbies where the ebatmap is "played in lobbies" and "remaining to be played in lobbies".
   * The lobbies are all lobbies currently being watched for a game (active lobby, being sacnend by the osu lobby scanner, and added to the game).
   *
   * @param {Game} game
   * @returns {VirtualMatch[]}
   */
  static buildVirtualMatchesForGame(game: Game): VirtualMatch[] {
    const matches: Match[] = _(game.gameLobbies)
      .map(gameLobby => gameLobby.lobby)
      .map(lobby => lobby.matches)
      .flattenDeep()
      .uniqBy(match => match.id)
      .cloneDeep()
      // A match that does not have a defined endTime is considered to have started but not yet ended (or it was aborted)
      // and therefore should not be counted as a match in a virtual match.
      .filter(match => match.endTime);

    const lobbies: Lobby[] = _(game.gameLobbies)
      .map(gameLobby => gameLobby.lobby)
      .uniqBy(lobby => lobby.id)
      .cloneDeep();

    return VirtualMatchCreator.buildVirtualMatchesGroupedByLobbyPlayedStatuses(matches, lobbies);
  }

  static buildVirtualMatchesGroupedByLobbyPlayedStatuses(matches: Match[], lobbies: Lobby[]): VirtualMatch[] {
    try {
      if (!matches || !matches.length) {
        Log.methodFailure(this.buildVirtualMatchesGroupedByLobbyPlayedStatuses, this.name, "Matches array arg was undefined or empty.");
        return new Array<VirtualMatch>();
      }
      if (!lobbies || !lobbies.length) {
        Log.methodFailure(this.buildVirtualMatchesGroupedByLobbyPlayedStatuses, this.name, "Lobbies array arg was undefined or empty.");
        return new Array<VirtualMatch>();
      }

      const virtualMatches = _(matches)
        .sortBy(match => sortByMatchOldestToLatest(LobbyBeatmapStatusMessageBuilder.buildMatchComponent(match)))
        .groupBy(match => VirtualMatchCreator.createSameBeatmapKeyStringForMatch(match, matches))
        .map((matches, matchesKey): VirtualMatchKey & { matches: Match[]; lobbies: Lobby[] } => {
          const keyAsObject = VirtualMatchCreator.createSameBeatmapKeyObjectFromKeyString(matchesKey);
          return {
            beatmapId: keyAsObject.beatmapId,
            sameBeatmapNumber: keyAsObject.sameBeatmapNumber,
            matches: matches,
            lobbies: lobbies
          };
        })
        .map<VirtualMatch>(o => {
          // greatestPlayedCount = the most number of times the same beatmap has been played in the same lobby
          // const greatestPlayedCount = Math.max(0, ...o.matches.map(m => m.lobby.matches.filter(lm => lm.beatmapId === m.beatmapId).length));
          const greatestPlayedCount = Math.max(
            0,
            ...o.matches.map(
              m => o.lobbies.find(ol => ol.id === m.lobby.id).matches.filter(lm => lm.beatmap?.beatmapId === m.beatmap?.beatmapId).length
            )
          );
          if (greatestPlayedCount < 1) {
            throw new Error(
              `Value for 'greatestPlayedCount' was ${greatestPlayedCount}. This means the beatmap was probably not found ` +
                `in any matches or lobbies. This should never happen :/`
            );
          }
          // "played" and "remaining" depends on how many times a lobby has played the same map.
          // e.g. If lobby 1 plays BM1, then lobby 2 plays BM1, then lobby 1 plays BM1 again, lobby 2 goes in "remaining"
          //       because we're still waiting on lobby 2 to complete BM1 for the 2nd time (o.sameBeatmapNumber = 2)
          const played = o.lobbies.filter(l =>
            VirtualMatchCreator.getNthMatchHavingBeatmapId({ searchMatches: l.matches, beatmapId: o.beatmapId, n: o.sameBeatmapNumber })
          );
          const remaining = o.lobbies.filter(l => !played.some(pl => pl.id === l.id));

          return {
            beatmapId: o.beatmapId,
            sameBeatmapNumber: o.sameBeatmapNumber,
            matches: o.matches,
            lobbies: {
              greatestPlayedCount: greatestPlayedCount,
              played: played,
              remaining: remaining
            }
          };
        })
        .value();

      return virtualMatches;
    } catch (error) {
      Log.methodError(this.buildVirtualMatchesGroupedByLobbyPlayedStatuses, this.name, error);
      throw error;
    }
  }

  private static createSameBeatmapKeyStringForMatch(match: Match, matches: Match[]): string {
    const obj = VirtualMatchCreator.createSameBeatmapKeyObjectForMatch(match, matches);
    const str = VirtualMatchCreator.createSameBeatmapKeyString(obj);
    return str;
  }

  static createSameBeatmapKeyObjectForMatch(match: Match, matches: Match[]): VirtualMatchKey {
    return {
      beatmapId: match.beatmap?.beatmapId,
      sameBeatmapNumber:
        matches
          .filter(m => m.lobby.id === match.lobby.id && m.beatmap?.beatmapId === match.beatmap?.beatmapId)
          .findIndex(m => m.id === match.id) + 1
    };
  }

  static createSameBeatmapKeyString({ beatmapId, sameBeatmapNumber }: VirtualMatchKey): string {
    return JSON.stringify({ beatmapId, sameBeatmapNumber });
  }

  static createSameBeatmapKeyObjectFromKeyString(key: string): VirtualMatchKey {
    return JSON.parse(key) as {
      beatmapId: string;
      sameBeatmapNumber: number;
    };
  }

  static getNthMatchHavingBeatmapId({ searchMatches, beatmapId, n }: { searchMatches: Match[]; beatmapId: string; n: number }): Match {
    return searchMatches.filter(m => m.beatmap?.beatmapId === beatmapId)[n - 1];
  }

  static isEqualVirtualMatchKey(key1: VirtualMatchKey, key2: VirtualMatchKey): boolean {
    return key1.beatmapId === key2.beatmapId && key1.sameBeatmapNumber === key2.sameBeatmapNumber;
  }

  static isEquivalentVirtualMatchByKey(vm1: VirtualMatch, vm2: VirtualMatch): boolean {
    return VirtualMatchCreator.isEqualVirtualMatchKey(
      {
        beatmapId: vm1.beatmapId,
        sameBeatmapNumber: vm1.sameBeatmapNumber
      },
      {
        beatmapId: vm2.beatmapId,
        sameBeatmapNumber: vm2.sameBeatmapNumber
      }
    );
  }

  /** We want the time of this event to be equal to the end-time of the match that ended most recently
   * (or the later start-time if the match has no end-time) */
  static getLatestMatchFromVirtualMatch(virtualMatch: VirtualMatch) {
    const sorted = _.sortBy<Match>(virtualMatch.matches, ["endTime", "startTime", "id"]);
    // return the last match (the later-occurring match)
    return sorted.slice(-1)[0];
  }

  /** Use the current system time if there are no matches, or if the match has no defined endTime or startTime */
  static getTimeOfMatch(match: Match): number {
    // TODO: return undefined instead of Date.now() - I think using Date.now is going to cause some really rare bugs. Best to avoid it. Will need to cleanup/change any code that uses this method.
    return match ? match.endTime || match.startTime || Date.now() : Date.now();
  }

  static getTimeOfApiMatch(match: ApiMatch): number {
    return match ? match.endTime || match.startTime || Date.now() : Date.now();
    // Note: match endTime or startTime may be a string (see comments on the Match entity property)
  }

  static getEstimatedTimeOfOccurrenceOfVirtualMatch(virtualMatch: VirtualMatch): number {
    const latestMatch = this.getLatestMatchFromVirtualMatch(virtualMatch);
    return this.getTimeOfMatch(latestMatch);
  }

  // static getLatestVirtualMatchCompletedByAllLobbiesForGame(game: Game): VirtualMatch {
  //   const allVirtualMatches = VirtualMatchCreator.buildVirtualMatchesForGame(game);
  //   // this assumes if no lobbies are listed under "remaining" then all the lobbies (added to this game) have played the map
  //   const playedByAllLobbies = allVirtualMatches.filter(b => !b.lobbies.remaining.length);
  //   return playedByAllLobbies.length ? playedByAllLobbies.slice(-1)[0] : null;
  // }

  // private static removeIncompleteVirtualMatches(virtualMatches: VirtualMatch[]): VirtualMatch[] {
  //   // this assumes if no lobbies are listed under "remaining" then that match has been completed by all game lobbies
  //   return virtualMatches.filter(b => !b.lobbies.remaining.length);
  // }
}
