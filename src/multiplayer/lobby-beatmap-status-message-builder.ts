import { Match } from "../domain/match/match.entity";
import { Lobby } from "../domain/lobby/lobby.entity";
import { VirtualBeatmap } from "./virtual-beatmap";
import { Match as MatchComponent } from "./components/match";
import { Lobby as LobbyComponent } from "./components/lobby";
import {
  LobbyCompletedBeatmapMessage,
  LobbyAwaitingBeatmapMessage,
  AllLobbiesCompletedBeatmapMessage
} from "./lobby-beatmap-status-message";
import _ = require("lodash"); // do not convert to default import -- it will break!!
import { BeatmapLobbyGrouper } from "./beatmap-lobby-grouper";
import { PlayMode } from "./components/enums/play-mode";
import { ScoringType } from "./components/enums/scoring-type";
import { TeamMode } from "./components/enums/team-mode";
import { Log } from "../utils/Log";

export class LobbyBeatmapStatusMessageBuilder {
  static gatherCompletedMessages({
    allMatches,
    beatmapsPlayed
  }: {
    allMatches: Match[];
    beatmapsPlayed: VirtualBeatmap[];
  }): LobbyCompletedBeatmapMessage[] {
    const completedMessages: LobbyCompletedBeatmapMessage[] = [];
    for (const match of allMatches) {
      if (!match.endTime) continue; // a match is only considered as "completed" when it has ended
      if (!match.startTime) continue;
      const beatmapNumber: number = LobbyBeatmapStatusMessageBuilder.getSameBeatmapNumberPlayedInLobbyForMatch(beatmapsPlayed, match);
      const message: LobbyCompletedBeatmapMessage = {
        message: `Lobby ${match.lobby.id} completed beatmap ${match.beatmapId}#${beatmapNumber}.`,
        lobby: LobbyBeatmapStatusMessageBuilder.buildLobbyComponent(match.lobby),
        match: LobbyBeatmapStatusMessageBuilder.buildMatchComponent(match),
        sameBeatmapNumber: beatmapNumber
      };
      completedMessages.push(message);
    }
    return _(completedMessages)
      .sortBy(cm => cm.match.startTime)
      .value();
  }

  static gatherWaitingMessages({ beatmapsPlayed }: { beatmapsPlayed: VirtualBeatmap[] }): LobbyAwaitingBeatmapMessage[] {
    const waitingMessages: LobbyAwaitingBeatmapMessage[] = [];
    for (const bmp of beatmapsPlayed) {
      for (const rLobby of bmp.lobbies.remaining) {
        const message: LobbyAwaitingBeatmapMessage = {
          message: `Waiting on beatmap ${bmp.beatmapId}#${bmp.sameBeatmapNumber} from lobby ${rLobby.id}.`,
          lobby: LobbyBeatmapStatusMessageBuilder.buildLobbyComponent(rLobby),
          sameBeatmapNumber: bmp.sameBeatmapNumber
        };
        waitingMessages.push(message);
      }
    }
    return waitingMessages;
  }

  static gatherAllLobbiesCompletedMessages({ beatmapsPlayed }: { beatmapsPlayed: VirtualBeatmap[] }): AllLobbiesCompletedBeatmapMessage[] {
    const allLobbiesCompletedMessages: AllLobbiesCompletedBeatmapMessage[] = [];
    for (const bmp of beatmapsPlayed) {
      if (!bmp.lobbies.remaining.length) {
        const message: AllLobbiesCompletedBeatmapMessage = {
          message: `All lobbies have completed beatmap ${bmp.beatmapId}#${bmp.sameBeatmapNumber}`,
          sameBeatmapNumber: bmp.sameBeatmapNumber
        };
        allLobbiesCompletedMessages.push(message);
      }
    }
    return allLobbiesCompletedMessages;
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
      const beatmapsPlayedUpToNow = BeatmapLobbyGrouper.buildBeatmapsGroupedByLobbyPlayedStatuses(matchesUpToNow, allLobbiesCopy);
      LobbyBeatmapStatusMessageBuilder.gatherCompletedMessages({
        allMatches: matchesUpToNow,
        beatmapsPlayed: beatmapsPlayedUpToNow
      });
      LobbyBeatmapStatusMessageBuilder.gatherWaitingMessages({ beatmapsPlayed: beatmapsPlayedUpToNow });
      LobbyBeatmapStatusMessageBuilder.gatherAllLobbiesCompletedMessages({
        beatmapsPlayed: beatmapsPlayedUpToNow
      });
    }
    return { completedMessages, waitingMessages, allLobbiesCompletedMessages };
  }

  private static buildLobbyComponent(fromLobby: Lobby): LobbyComponent {
    return { banchoLobbyId: fromLobby.banchoMultiplayerId, lobbyName: "TODO:LobbyName", resultsUrl: "TODO:LobbyResultsURL" };
  }

  private static buildMatchComponent(fromMatchEntity: Match): MatchComponent {
    return {
      startTime: fromMatchEntity.startTime,
      endTime: fromMatchEntity.endTime,
      playMode: PlayMode.Standard,
      scoringType: ScoringType.scoreV2,
      teamType: TeamMode.HeadToHead,
      forcedMods: 0,
      beatmap: { mapId: fromMatchEntity.beatmapId, mapUrl: "TODO:MapURL", mapString: "TODO:MapString" },
      status: "completed",
      entityId: fromMatchEntity.id
    }; // TODO: get PlayMode, ScoringType, TeamMode, Mods, status
  }

  private static getSameBeatmapNumberPlayedInLobbyForMatch(beatmapsPlayed: VirtualBeatmap[], match: Match): number {
    try {
      // This relies on the matches listed under each "beatmapPlayed" to be only listed there if the match was played for a specific "same beatmap number".
      // i.e. The matches listed under "beatmapPlayed" should not contain every match played with that beatmap ID, instead it should only
      //      list matches included for that beatmap ID *and* what number of times that specific beatmap ID has been played.
      for (const bmp of beatmapsPlayed) {
        if (bmp.matches.some(m => m.id === match.id)) {
          return bmp.sameBeatmapNumber;
        }
      }
      throw new Error("Target match not found.");
    } catch (error) {
      Log.methodError(this.getSameBeatmapNumberPlayedInLobbyForMatch, this.name, error);
      throw error;
    }
  }
}
