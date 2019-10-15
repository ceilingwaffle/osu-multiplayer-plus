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
import { GameEvent } from "./game-events/game-event";
import { Game } from "../domain/game/game.entity";
import { GameEventRegistrar } from "./game-events/game-event-registrar";
import {
  LobbyCompletedBeatmapMessage,
  LobbyAwaitingBeatmapMessage,
  AllLobbiesCompletedBeatmapMessage,
  LobbyBeatmapStatusMessage,
  LobbyBeatmapStatusMessageGroup
} from "./lobby-beatmap-status-message";
import _ = require("lodash"); // do not convert to default import -- it will break!!
import { VirtualMatch } from "./virtual-match";
import { VirtualMatchCreator, SameBeatmapKey } from "./virtual-match-creator";
import { LobbyBeatmapStatusMessageBuilder } from "./lobby-beatmap-status-message-builder";
import { MultiplayerEntitySaver } from "./multiplayer-entity-saver";
import { MessageType } from "./lobby-beatmap-status-message";

export interface VirtualMatchGameEventGroup {
  beatmapId: string;
  sameBeatmapNumber: number;
  events: GameEvent[];
  messages?: LobbyBeatmapStatusMessageGroup;
}

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
    return VirtualMatchCreator.buildVirtualMatchesForGame(game);
  }

  buildLobbyMatchReportMessages({
    virtualMatchesPlayed,
    reportedMatches,
    allGameLobbies
  }: {
    virtualMatchesPlayed: VirtualMatch[];
    reportedMatches: Match[];
    allGameLobbies: Lobby[];
  }): LobbyBeatmapStatusMessageGroup {
    // creating clones of both the matches and the lobbies just for safety - in case they get modified anywhere
    const allMatches: Match[] = _(virtualMatchesPlayed)
      .map(bmp => bmp.matches)
      .flatten()
      .uniqBy(match => match.id)
      .sortBy(match => match.startTime)
      .cloneDeep();

    // const allLobbies = _(allGameLobbies)
    //   .uniqBy(l => l.id)
    //   .cloneDeep();

    const completedMessages: LobbyCompletedBeatmapMessage[] = LobbyBeatmapStatusMessageBuilder.gatherCompletedMessages({
      matches: allMatches,
      virtualMatchesPlayed
    }).filter(filterOutMessagesForReportedMatches(reportedMatches));
    const waitingMessages: LobbyAwaitingBeatmapMessage[] = LobbyBeatmapStatusMessageBuilder.gatherWaitingMessages({
      virtualMatchesPlayed
    }).filter(filterOutMessagesForReportedMatches(reportedMatches));
    const allLobbiesCompletedMessages: AllLobbiesCompletedBeatmapMessage[] = LobbyBeatmapStatusMessageBuilder.gatherAllLobbiesCompletedMessages(
      { virtualMatchesPlayed }
    ).filter(filterOutMessagesForReportedMatches(reportedMatches));

    // for (let i = 0; i < allMatches.length; i++) {
    //   // we filter out any matches not yet "seen by" each lobby, so we can generate virtual matches up to this point in time
    //   const matchesUpToNow = allMatches.slice(0, i + 1);
    //   const allLobbiesCopy: Lobby[] = _(allLobbies).cloneDeep();
    //   allLobbiesCopy.forEach(l => (l.matches = l.matches.filter(lm => matchesUpToNow.some(m => m.id === lm.id))));
    //   const virtualMatchesPlayedUpToNow = VirtualMatchCreator.buildVirtualMatchesGroupedByLobbyPlayedStatuses(
    //     matchesUpToNow,
    //     allLobbiesCopy
    //   );
    //   const completedMessages: LobbyCompletedBeatmapMessage[] = LobbyBeatmapStatusMessageBuilder.gatherCompletedMessages({
    //     matches: matchesUpToNow,
    //     virtualMatchesPlayed: virtualMatchesPlayedUpToNow
    //   }).filter(filterOutMessagesForReportedMatches(reportedMatches));
    //   const waitingMessages: LobbyAwaitingBeatmapMessage[] = LobbyBeatmapStatusMessageBuilder.gatherWaitingMessages({
    //     virtualMatchesPlayed: virtualMatchesPlayedUpToNow
    //   }).filter(filterOutMessagesForReportedMatches(reportedMatches));
    //   const allLobbiesCompletedMessages: AllLobbiesCompletedBeatmapMessage[] = LobbyBeatmapStatusMessageBuilder.gatherAllLobbiesCompletedMessages(
    //     {
    //       virtualMatchesPlayed: virtualMatchesPlayedUpToNow
    //     }
    //   ).filter(filterOutMessagesForReportedMatches(reportedMatches));
    // }

    const map = new Map<MessageType, LobbyBeatmapStatusMessage<MessageType>[]>();
    map.set("lobby_completed", completedMessages);
    map.set("lobby_awaiting", waitingMessages);
    map.set("all_lobbies_completed", allLobbiesCompletedMessages);

    return map;
  }

  buildGameEventsGroupedByVirtualMatches({
    game,
    reportedMatches,
    messages
  }: {
    game: Game;
    reportedMatches: Match[];
    messages: LobbyBeatmapStatusMessageGroup;
  }): VirtualMatchGameEventGroup[] {
    const gameEvents = this.buildUnreportedGameEventsForGame({ game, reportedMatches });
    const groups = this.buildVirtualMatchGameEventGroupsFromGameEvents(gameEvents);
    this.addMessagesToVirtualMatchGameEventGroups(groups, messages);
    return groups;
  }

  private addMessagesToVirtualMatchGameEventGroups(groups: VirtualMatchGameEventGroup[], messages: LobbyBeatmapStatusMessageGroup): void {
    if (!messages) return;

    messages.forEach((messages, messagesType) => {
      groups.forEach(vmg => {
        if (!vmg.messages) vmg.messages = new Map<typeof messagesType, LobbyBeatmapStatusMessage<MessageType>[]>();
        if (vmg.messages.has(messagesType)) {
          vmg.messages.get(messagesType).push(...messages.filter(message => message.type === messagesType));
        } else {
          vmg.messages.set(
            messagesType,
            messages.filter(msg => msg.sameBeatmapNumber === vmg.sameBeatmapNumber && msg.beatmapId === vmg.beatmapId)
          );
        }
      });
    });
  }

  private buildUnreportedGameEventsForGame({ game, reportedMatches }: { game: Game; reportedMatches: Match[] }): GameEvent[] {
    const unreportedVirtualMatches = VirtualMatchCreator.buildAllVirtualMatchesForGameForUnreportedMatches({
      game,
      reportedMatches
    });
    // const unreportedCompletedVirtualMatches = VirtualMatchCreator.buildCompletedVirtualMatchesForGameForUnreportedMatches({
    //   game,
    //   reportedMatches
    // });
    const processedEvents: GameEvent[] = this.buildAndProcessGameEventsForVirtualMatches({
      game,
      virtualMatches: unreportedVirtualMatches
    });
    return processedEvents;
  }

  private buildAndProcessGameEventsForVirtualMatches({ game, virtualMatches }: { game: Game; virtualMatches: VirtualMatch[] }) {
    const registrar: GameEventRegistrar = this.gameEventRegistrarCollection.findOrCreate(game.id);
    const registeredEvents: GameEvent[] = registrar.getEvents();
    const processedEvents: GameEvent[] = [];
    for (const vMatch of virtualMatches) {
      for (const eventType in registeredEvents) {
        const event: GameEvent = registeredEvents[eventType];
        // we clone the event to prevent happenedIn() setting the event data on the same event multiple times
        // (to ensure each game event has its own unique set of data)

        // TODO: Do not process event if any entries listed under VirtualMatch.remaining + Log skipping with this reason.

        const eventCopy: GameEvent = _.cloneDeep(event);
        if (eventCopy.happenedIn({ game, targetVirtualMatch: vMatch, allVirtualMatches: virtualMatches })) {
          // event should have event.data defined if happenedIn === true
          processedEvents.push(eventCopy);
        }
      }
    }
    return processedEvents;
  }

  private buildVirtualMatchGameEventGroupsFromGameEvents(processedEvents: GameEvent[]): VirtualMatchGameEventGroup[] {
    return _(processedEvents)
      .groupBy(event => {
        if (event.data) {
          return VirtualMatchCreator.createSameBeatmapKeyString({
            beatmapId: event.data.eventMatch.beatmapId,
            sameBeatmapNumber: event.data.eventMatch.sameBeatmapNumber
          });
        }
      })
      .map((events, groupKey) => {
        const keyObject = VirtualMatchCreator.createSameBeatmapKeyObjectFromKeyString(groupKey);
        return { beatmapId: keyObject.beatmapId, sameBeatmapNumber: keyObject.sameBeatmapNumber, events: events };
      })
      .toArray()
      .value();
  }

  // buildGameReport(gameEvents: GameEvent[]): GameReport {
  //   Log.warn("TODO: Implement method of MultiplayerResultsProcessor.");
  //   return null;
  // }

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
function filterOutMessagesForReportedMatches(
  reportedMatches: Match[]
): (value: LobbyBeatmapStatusMessage<MessageType>, index: number, array: LobbyBeatmapStatusMessage<MessageType>[]) => unknown {
  return message => !reportedMatches.find(rm => message.match && message.match.entityId && message.match.entityId === rm.id);
}
