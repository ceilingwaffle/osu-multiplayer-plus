import iocContainer from "../inversify.config";
import getDecorators from "inversify-inject-decorators";
import { TYPES } from "../types";
const { lazyInject } = getDecorators(iocContainer);
import { ApiMultiplayer } from "../osu/types/api-multiplayer";
import { GameReport } from "./reports/game.report";
import { Log } from "../utils/Log";
import { Lobby } from "../domain/lobby/lobby.entity";
import { Match } from "../domain/match/match.entity";
import { GameEventRegistrarCollection } from "./game-events/game-event-registrar-collection";
import { GameEvent, getCompletedVirtualBeatmapsOfGameForGameEventType } from "./game-events/game-event";
import { Game } from "../domain/game/game.entity";
import { GameEventRegistrar } from "./game-events/game-event-registrar";
import {
  LobbyCompletedBeatmapMessage,
  LobbyAwaitingBeatmapMessage,
  AllLobbiesCompletedBeatmapMessage,
  LobbyBeatmapStatusMessageTypes
} from "./lobby-beatmap-status-message";
import _ = require("lodash"); // do not convert to default import -- it will break!!
import { VirtualBeatmap } from "./virtual-beatmap";
import { BeatmapLobbyGrouper } from "./beatmap-lobby-grouper";
import { LobbyBeatmapStatusMessageBuilder } from "./lobby-beatmap-status-message-builder";
import { MultiplayerEntitySaver } from "./multiplayer-entity-saver";

export class MultiplayerResultsProcessor {
  // TODO: Don't get these from the ioc container - should be able to inject somehow
  private gameEventRegistrarCollection: GameEventRegistrarCollection = iocContainer.get<GameEventRegistrarCollection>(TYPES.GameEventRegistrarCollection); //prettier-ignore

  constructor(protected readonly input: ApiMultiplayer) {
    Log.info(`Initialized ${this.constructor.name}.`);
  }

  async saveMultiplayerEntities() {
    return MultiplayerEntitySaver.saveMultiplayerEntities(this.input);
  }

  buildBeatmapsGroupedByLobbyPlayedStatusesForGame(game: Game) {
    return BeatmapLobbyGrouper.buildBeatmapsGroupedByLobbyPlayedStatusesForGame(game);
  }

  buildLobbyMatchReportMessages({
    beatmapsPlayed,
    reportedMatches,
    allGameLobbies
  }: {
    beatmapsPlayed: VirtualBeatmap[];
    reportedMatches: Match[];
    allGameLobbies: Lobby[];
  }): LobbyBeatmapStatusMessageTypes[] {
    // creating clones of both the matches and the lobbies just for safety - in case they get modified anywhere
    const allMatches: Match[] = _(beatmapsPlayed)
      .map(bmp => bmp.matches)
      .flatten()
      .uniqBy(match => match.id)
      .sortBy(match => match.startTime)
      .cloneDeep();

    const allLobbies = _(allGameLobbies)
      .uniqBy(l => l.id)
      .cloneDeep();

    const completedMessages: LobbyCompletedBeatmapMessage[] = LobbyBeatmapStatusMessageBuilder.gatherCompletedMessages({
      allMatches,
      beatmapsPlayed
    });
    const waitingMessages: LobbyAwaitingBeatmapMessage[] = LobbyBeatmapStatusMessageBuilder.gatherWaitingMessages({
      beatmapsPlayed
    });
    const allLobbiesCompletedMessages: AllLobbiesCompletedBeatmapMessage[] = LobbyBeatmapStatusMessageBuilder.gatherAllLobbiesCompletedMessages(
      { beatmapsPlayed }
    );

    for (let i = 0; i < allMatches.length; i++) {
      // we filter out any matches not yet "seen by" each lobby, so we can generate groups of beatmaps up to this point in time
      const matchesUpToNow = allMatches.slice(0, i + 1);
      const allLobbiesCopy: Lobby[] = _(allLobbies).cloneDeep();
      allLobbiesCopy.forEach(l => (l.matches = l.matches.filter(lm => matchesUpToNow.some(m => m.id === lm.id))));
      const beatmapsPlayedUpToNow = BeatmapLobbyGrouper.buildBeatmapsGroupedByLobbyPlayedStatuses(matchesUpToNow, allLobbiesCopy);
      const completedMessages: LobbyCompletedBeatmapMessage[] = LobbyBeatmapStatusMessageBuilder.gatherCompletedMessages({
        allMatches: matchesUpToNow,
        beatmapsPlayed: beatmapsPlayedUpToNow
      });
      const waitingMessages: LobbyAwaitingBeatmapMessage[] = LobbyBeatmapStatusMessageBuilder.gatherWaitingMessages({
        beatmapsPlayed: beatmapsPlayedUpToNow
      });
      const allLobbiesCompletedMessages: AllLobbiesCompletedBeatmapMessage[] = LobbyBeatmapStatusMessageBuilder.gatherAllLobbiesCompletedMessages(
        {
          beatmapsPlayed: beatmapsPlayedUpToNow
        }
      );
    }

    // TODO: Filter out reportedMatches

    Log.warn("TODO - implement method", this.buildLobbyMatchReportMessages.name, this.constructor.name);
    return null;
  }

  buildLeaderboardEvents(game: Game): GameEvent[] {
    const registrar: GameEventRegistrar = this.gameEventRegistrarCollection.findOrCreate(game.id);
    const events: GameEvent[] = registrar.getEvents();
    const leaderboardEvents: GameEvent[] = [];

    for (const eventType in events) {
      const event: GameEvent = events[eventType];
      const completedVirtualBeatmaps: VirtualBeatmap | VirtualBeatmap[] = getCompletedVirtualBeatmapsOfGameForGameEventType({
        eventType: event.type,
        game
      });
      if (event.happenedIn({ game, virtualBeatmaps: completedVirtualBeatmaps })) {
        // event should have event.data defined if happenedIn === true
        leaderboardEvents.push(event);
      }
    }
    return leaderboardEvents;
  }

  buildGameReport(leaderboardEvents: GameEvent[]): GameReport {
    Log.warn("TODO: Implement method of MultiplayerResultsProcessor.");
    return null;
  }

  // async buildGameReports(forGames: Game[]): Promise<GameReport[]> {
  //   try {
  //     if (!this.markAsProcessed) {
  //       throw new Error("Must process API results first before building report.");
  //     }
  //     // TODO: get report entities from DB
  //     // TODO: build report

  //     // Sequence of things to do:
  //     //    - Figure out what events we want to track -> add those events to the EventRegistrar
  //     //          - Register events in the EventRegistrar
  //     //
  //     //
  //     //    - Determine if ready to report results for a GameLobby map:
  //     for (const game of forGames) {
  //       const ready = this.allGameLobbiesFinishedMap(game.gameLobbies);
  //     }
  //     //
  //     //    - Build game events
  //     //          EventBuilder(game.matches) -> GameEvents[]
  //     //    - Build messages
  //     //          e.g. Lobby 1 completed BM1#1.
  //     //          e.g. Waiting on BM1#1 from lobbies 2."
  //     //          e.g. All lobbies have completed BM2#1
  //     //    - Build leaderboard
  //     //          LeaderboardBuilder(event[]) -> Leaderboard
  //     //    - Deliver leaderboard and game-message-targets to DiscordMessageBuilder
  //     //          DiscordMessageBuilder.sendLeaderboard(game, leaderboard)
  //     //
  //     //
  //     //
  //     // --------- IDEA -------------
  //     // - api has pushed some data for a lobby result (e.g. map finished)
  //     // - MpResultsProcessor processes that data with .process()
  //     //       - saves the data in the database
  //     //       - forwards the saved data to the GameReportBuilder
  //     // - GameReportBuilder
  //     //       - determines the latest events that happened in the game
  //     //       - builds the game report (with a leaderboard) from those
  //     // -----------------------------

  //     // Build a collection of game-events for the leaderboard for each game we received match-results for.
  //     const gameEventRegistrarCollection: GameEventRegistrarCollection = iocContainer.get<GameEventRegistrarCollection>(
  //       TYPES.GameEventRegistrarCollection
  //     );

  //     for (const game of forGames) {
  //       const registrar: GameEventRegistrar = gameEventRegistrarCollection.findOrCreate(game.id);
  //       const events: GameEvent[] = registrar.getEvents();
  //       const leaderboardEvents: GameEvent[] = [];
  //       for (const eventType in events) {
  //         const event: GameEvent = events[eventType];
  //         if (event.happenedIn(game)) {
  //           // event should have event.data defined if happenedIn === true
  //           leaderboardEvents.push(event);
  //         }
  //       }
  //     }

  //     return null;

  //     // build the "most recent" game report with leaderboard-data for the events determined by the entire history of the game's matches
  //     // const gameReportBuilder = new GameReportBuilder(leaderboardEvents);
  //     // const gameReport = gameReportBuilder.build();

  //     // after building, fire event "report created for game <gameId>"

  //     // throw new Error("TODO: Implement method of MultiplayerResultsProcessor.");
  //   } catch (error) {
  //     Log.methodError(this.buildGameReports, this.constructor.name, error);
  //     throw error;
  //   }
  // }

  // private allGameLobbiesFinishedMap(gameLobbies: GameLobby[]): boolean {
  //   const lobbyMatchIds: { lid: number; mids: number[] }[] = gameLobbies.map(gl => {
  //     return { lid: gl.lobby.id, mids: [] };
  //   });
  //   //       - get all game lobbies and their matches (ordered such that the most recently-completed matches are listed at a later index for that game lobby)
  //   //       - if all game lobbies have match results for a map
  //   gameLobbies.forEach(gl => {
  //     gl.lobby.matches.forEach(m => {
  //       lobbyMatchIds.find(lmid => lmid.lid === gl.lobby.id).mids.push(m.id);
  //     });
  //   });
  //   let smallestMatchCount = Number.POSITIVE_INFINITY;
  //   lobbyMatchIds.map(lmid => {
  //     if (lmid.mids.length < smallestMatchCount) smallestMatchCount = lmid.mids.length;
  //   });
  //   //          - trim all other GameLobby arrays to have the same size as the smallest array.
  //   let glsTrimmed = cloneDeep(gameLobbies);
  //   glsTrimmed = glsTrimmed.map(gl => {
  //     if (smallestMatchCount < gl.lobby.matches.length) {
  //       gl.lobby.matches.splice(smallestMatchCount, gl.lobby.matches.length - smallestMatchCount);
  //     }
  //     return gl;
  //   });

  //   // game.latestReportedMatch: { matchBeatmapId: number, sameLobbyMapIdsLatestEndTime: number }

  //   //          - if array1 is not empty, and if results have not been calculated for match at array1[n-1], that map is complete --> report results
  //   // if (glsTrimmed[0].lobby.matches.length && )
  //   //      - if not ready to report results
  //   //         - deliver message "Lobby L1 finished map A (id, mapString). Waiting on results from lobbies B,C,..."
  //   //
  //   return false;
  // }
}
