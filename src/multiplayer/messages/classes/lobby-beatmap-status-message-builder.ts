import { Match } from "../../../domain/match/match.entity";
import { Lobby } from "../../../domain/lobby/lobby.entity";
import { VirtualMatch } from "../../virtual-match/virtual-match";
import { Match as MatchComponent, sortByMatchOldestToLatest } from "../../components/match";
import { Lobby as LobbyComponent } from "../../components/lobby";
import { LobbyAwaitingBeatmapMessage } from "../lobby-awaiting-beatmap-message";
import _ = require("lodash"); // do not convert to default import -- it will break!!
import { VirtualMatchCreator } from "../../virtual-match/virtual-match-creator";
import { PlayMode } from "../../components/enums/play-mode";
import { ScoringType } from "../../components/enums/scoring-type";
import { TeamMode } from "../../components/enums/team-mode";
import { Log } from "../../../utils/Log";
import { LobbyCompletedBeatmapMessage } from "../lobby-completed-beatmap-message";
import { AllLobbiesCompletedBeatmapMessage } from "../all-lobbies-completed-beatmap-message";

export class LobbyBeatmapStatusMessageBuilder {
  /**
   * Builds messages for individual beatmaps (matches) considered "completed" in a lobby.
   *
   * @static
   * @param {{
   *     matches: Match[];
   *     virtualMatchesPlayed: VirtualMatch[];
   *   }} {
   *     matches,
   *     virtualMatchesPlayed: beatmapsPlayed
   *   }
   * @returns {LobbyCompletedBeatmapMessage[]}
   */
  static gatherCompletedMessages({
    matches,
    virtualMatchesPlayed: beatmapsPlayed
  }: {
    matches: Match[];
    virtualMatchesPlayed: VirtualMatch[];
  }): LobbyCompletedBeatmapMessage[] {
    const completedMessages: LobbyCompletedBeatmapMessage[] = [];
    for (const match of matches) {
      if (!match.endTime) continue; // a match is only considered as "completed" when it has ended
      if (!match.startTime) continue;
      const beatmapNumber: number = LobbyBeatmapStatusMessageBuilder.getSameBeatmapNumberPlayedInLobbyForMatch(beatmapsPlayed, match);
      const message: LobbyCompletedBeatmapMessage = {
        message: `Lobby ${match.lobby.id} completed beatmap ${match.beatmap?.beatmapId}#${beatmapNumber}.`,
        lobby: LobbyBeatmapStatusMessageBuilder.buildLobbyComponent(match.lobby),
        match: LobbyBeatmapStatusMessageBuilder.buildMatchComponent(match),
        sameBeatmapNumber: beatmapNumber,
        beatmapId: match.beatmap?.beatmapId,
        type: "lobby_completed",
        time: match.endTime
      };
      completedMessages.push(message);
    }
    return _(completedMessages)
      .sortBy(cm => sortByMatchOldestToLatest(cm.match))
      .value();
  }

  static gatherWaitingMessages({ virtualMatchesPlayed }: { virtualMatchesPlayed: VirtualMatch[] }): LobbyAwaitingBeatmapMessage[] {
    const waitingMessages: LobbyAwaitingBeatmapMessage[] = [];
    for (const vMatch of virtualMatchesPlayed) {
      for (const rLobby of vMatch.lobbies.remaining) {
        const message: LobbyAwaitingBeatmapMessage = {
          message: `Waiting on beatmap ${vMatch.beatmapId}#${vMatch.sameBeatmapNumber} from lobby ${rLobby.id}.`,
          lobby: LobbyBeatmapStatusMessageBuilder.buildLobbyComponent(rLobby),
          sameBeatmapNumber: vMatch.sameBeatmapNumber,
          beatmapId: vMatch.beatmapId,
          type: "lobby_awaiting",
          time: Date.now()
        };
        waitingMessages.push(message);
      }
    }
    return waitingMessages;
  }

  static gatherAllLobbiesCompletedMessages({
    virtualMatchesPlayed
  }: {
    virtualMatchesPlayed: VirtualMatch[];
  }): AllLobbiesCompletedBeatmapMessage[] {
    const messages: AllLobbiesCompletedBeatmapMessage[] = [];
    for (const vMatch of virtualMatchesPlayed) {
      if (!vMatch.lobbies.remaining.length) {
        const message: AllLobbiesCompletedBeatmapMessage = {
          message: `All lobbies have completed beatmap ${vMatch.beatmapId}#${vMatch.sameBeatmapNumber}`,
          sameBeatmapNumber: vMatch.sameBeatmapNumber,
          beatmapId: vMatch.beatmapId,
          type: "all_lobbies_completed",
          time: Date.now()
        };
        messages.push(message);
      }
    }
    return messages;
  }

  static gatherMessagesForEachPointInTime(
    allMatches: Match[],
    allLobbies: Lobby[]
  ): {
    completedMessages: LobbyCompletedBeatmapMessage[];
    waitingMessages: LobbyAwaitingBeatmapMessage[];
    allLobbiesCompletedMessages: AllLobbiesCompletedBeatmapMessage[];
  } {
    const completedMessages: LobbyCompletedBeatmapMessage[] = [];
    const waitingMessages: LobbyAwaitingBeatmapMessage[] = [];
    const allLobbiesCompletedMessages: AllLobbiesCompletedBeatmapMessage[] = [];
    for (let i = 0; i < allMatches.length; i++) {
      // we filter out any matches not yet "seen by" each lobby, so we can generate groups of beatmaps up to this point in time
      const matchesUpToNow = allMatches.slice(0, i + 1);
      const allLobbiesCopy: Lobby[] = _(allLobbies).cloneDeep();
      allLobbiesCopy.forEach(l => (l.matches = l.matches.filter(lm => matchesUpToNow.some(m => m.id === lm.id))));
      const virtualMatchesPlayedUpToNow = VirtualMatchCreator.buildVirtualMatchesGroupedByLobbyPlayedStatuses(
        matchesUpToNow,
        allLobbiesCopy
      );
      LobbyBeatmapStatusMessageBuilder.gatherCompletedMessages({
        matches: matchesUpToNow,
        virtualMatchesPlayed: virtualMatchesPlayedUpToNow
      });
      LobbyBeatmapStatusMessageBuilder.gatherWaitingMessages({ virtualMatchesPlayed: virtualMatchesPlayedUpToNow });
      LobbyBeatmapStatusMessageBuilder.gatherAllLobbiesCompletedMessages({
        virtualMatchesPlayed: virtualMatchesPlayedUpToNow
      });
    }
    return { completedMessages, waitingMessages, allLobbiesCompletedMessages };
  }

  static buildLobbyComponent(fromLobby: Lobby): LobbyComponent {
    return {
      banchoLobbyId: fromLobby.banchoMultiplayerId,
      lobbyName: "TODO:LobbyName",
      resultsUrl: "TODO:LobbyResultsURL",
      scoreType: ScoringType.combo
    };
  }

  static buildMatchComponent(fromMatchEntity: Match): MatchComponent {
    return {
      startTime: fromMatchEntity.startTime,
      endTime: fromMatchEntity.endTime,
      playMode: PlayMode.Standard,
      scoringType: ScoringType.scoreV2,
      teamType: TeamMode.HeadToHead,
      forcedMods: 0,
      beatmap: {
        beatmapId: fromMatchEntity.beatmap?.beatmapId,
        beatmapUrl: fromMatchEntity.beatmap?.beatmapUrl,
        // mapString: "TODO:   MapString",
        stars: 99,
        beatmapSetId: fromMatchEntity.beatmap?.beatmapSetId,
        title: fromMatchEntity.beatmap?.title,
        artist: fromMatchEntity.beatmap?.artist,
        diffName: fromMatchEntity.beatmap?.diffName,
        backgroundThumbnailUrlLarge: fromMatchEntity.beatmap?.backgroundThumbnailUrlLarge,
        backgroundThumbnailUrlSmall: fromMatchEntity.beatmap?.backgroundThumbnailUrlSmall
      },
      status: "completed",
      entityId: fromMatchEntity.id
    }; // TODO: get PlayMode, ScoringType, TeamMode, Mods, status
  }

  private static getSameBeatmapNumberPlayedInLobbyForMatch(virtualMatchesPlayed: VirtualMatch[], match: Match): number {
    try {
      // This relies on the matches listed under each "beatmapPlayed" to be only listed there if the match was played for a specific "same beatmap number".
      // i.e. The matches listed under "beatmapPlayed" should not contain every match played with that beatmap ID, instead it should only
      //      list matches included for that beatmap ID *and* what number of times that specific beatmap ID has been played.
      for (const vMatch of virtualMatchesPlayed) {
        if (vMatch.matches.some(m => m.id === match.id)) {
          return vMatch.sameBeatmapNumber;
        }
      }
      throw new Error("Target match not found.");
    } catch (error) {
      Log.methodError(this.getSameBeatmapNumberPlayedInLobbyForMatch, this.name, error);
      throw error;
    }
  }
}
