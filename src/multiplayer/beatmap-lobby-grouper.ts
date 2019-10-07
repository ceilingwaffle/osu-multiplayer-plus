import { BeatmapLobbyPlayedStatusGroup } from "./beatmap-lobby-played-status-group";
import { Match } from "../domain/match/match.entity";
import _ = require("lodash"); // do not convert to default import -- it will break!!
import { Lobby } from "../domain/lobby/lobby.entity";
import { Log } from "../utils/Log";
import { Game } from "../domain/game/game.entity";

export class BeatmapLobbyGrouper {
  /**
   * Returns a list of beatmaps each containing lists of lobbies where the ebatmap is "played in lobbies" and "remaining to be played in lobbies".
   * The lobbies are all lobbies currently being watched for a game (active lobby, being sacnend by the osu lobby scanner, and added to the game).
   *
   * @param {Game} game
   * @returns {BeatmapLobbyPlayedStatusGroup[]}
   */
  static buildBeatmapsGroupedByLobbyPlayedStatusesForGame(game: Game): BeatmapLobbyPlayedStatusGroup[] {
    const matches: Match[] = _(game.gameLobbies)
      .map(gameLobby => gameLobby.lobby)
      .map(lobby => lobby.matches)
      .flattenDeep()
      .uniqBy(match => match.id)
      .cloneDeep();

    const lobbies: Lobby[] = _(game.gameLobbies)
      .map(gameLobby => gameLobby.lobby)
      .uniqBy(lobby => lobby.id)
      .cloneDeep();

    return BeatmapLobbyGrouper.buildBeatmapsGroupedByLobbyPlayedStatuses(matches, lobbies);
  }

  static buildBeatmapsGroupedByLobbyPlayedStatuses(matches: Match[], lobbies: Lobby[]): BeatmapLobbyPlayedStatusGroup[] {
    try {
      if (!matches || !matches.length) {
        Log.methodFailure(this.buildBeatmapsGroupedByLobbyPlayedStatuses, this.name, "Matches array arg was undefined or empty.");
        return new Array<BeatmapLobbyPlayedStatusGroup>();
      }
      if (!lobbies || !lobbies.length) {
        Log.methodFailure(this.buildBeatmapsGroupedByLobbyPlayedStatuses, this.name, "Lobbies array arg was undefined or empty.");
        return new Array<BeatmapLobbyPlayedStatusGroup>();
      }

      const r = _(matches)
        .sortBy(match => match.startTime)
        .groupBy(match =>
          JSON.stringify({
            beatmapId: match.beatmapId,
            sameBeatmapNumber:
              matches.filter(m => m.lobby.id === match.lobby.id && m.beatmapId === match.beatmapId).findIndex(m => m.id === match.id) + 1
          })
        )
        .map((matches, matchesKey) => {
          const keyAsObject = JSON.parse(matchesKey) as { beatmapId: string; sameBeatmapNumber: number };
          return {
            beatmapId: keyAsObject.beatmapId,
            sameBeatmapNumber: keyAsObject.sameBeatmapNumber,
            matches: matches,
            lobbies: lobbies
          };
        })
        .map<BeatmapLobbyPlayedStatusGroup>(o => {
          // greatestPlayedCount = the most number of times the same beatmap has been played in the same lobby
          // const greatestPlayedCount = Math.max(0, ...o.matches.map(m => m.lobby.matches.filter(lm => lm.beatmapId === m.beatmapId).length));
          const greatestPlayedCount = Math.max(
            0,
            ...o.matches.map(m => o.lobbies.find(ol => ol.id === m.lobby.id).matches.filter(lm => lm.beatmapId === m.beatmapId).length)
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
            BeatmapLobbyGrouper.getNthMatchHavingBeatmapId({ searchMatches: l.matches, beatmapId: o.beatmapId, n: o.sameBeatmapNumber })
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

      return r;
    } catch (error) {
      Log.methodError(this.buildBeatmapsGroupedByLobbyPlayedStatuses, this.name, error);
      throw error;
    }
  }

  static getNthMatchHavingBeatmapId({ searchMatches, beatmapId, n }: { searchMatches: Match[]; beatmapId: string; n: number }): Match {
    return searchMatches.filter(m => m.beatmapId === beatmapId)[n - 1];
  }
}
