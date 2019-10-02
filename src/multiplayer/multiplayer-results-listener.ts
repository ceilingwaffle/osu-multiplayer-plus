import { OsuLobbyScannerEventDataMap } from "../osu/interfaces/osu-lobby-scanner-events";
import { Log } from "../utils/Log";
import { GameReport } from "./reports/game.report";
import { MultiplayerResultsProcessor, BeatmapLobbyGroup } from "./multiplayer-results-processor";
import Emittery = require("emittery");
import { ApiMultiplayer } from "../osu/types/api-multiplayer";
import { Game } from "../domain/game/game.entity";
import { MultiplayerMessage as LobbyBeatmapStatusMessage } from "./messages/multiplayer-message";
import { GameEvent } from "./game-events/game-event";

export class MultiplayerResultsListener extends Emittery.Typed<OsuLobbyScannerEventDataMap> {
  constructor(protected readonly eventEmitter: Emittery.Typed<OsuLobbyScannerEventDataMap>) {
    super();
    Log.info(`Initialized ${this.constructor.name}.`);
    this.registerEventListeners();
  }

  private registerEventListeners(): void {
    this.handleNewMultiplayerMatches();
    // this.emitter.on("newMultiplayerMatches", _ => {
    //   Log.warn("Event newMultiplayerMatches (normal)", { mpid: _.multiplayerId, matches: _.matches.length });
    // });
  }

  private async handleNewMultiplayerMatches(): Promise<void> {
    const apiMultiplayerResults: AsyncIterableIterator<ApiMultiplayer> = this.eventEmitter.events("newMultiplayerMatches");
    for await (const apiMultiplayerResult of apiMultiplayerResults) {
      Log.warn("Event newMultiplayerMatches (buffer)", {
        mpid: apiMultiplayerResult.multiplayerId,
        matchesCount: apiMultiplayerResult.matches.length,
        targetGameIds: Array.from(apiMultiplayerResult.targetGameIds)
      });

      const processor = new MultiplayerResultsProcessor(apiMultiplayerResult);
      const multiplayerGames: Game[] = await processor.saveMultiplayerEntities();

      for (const game of multiplayerGames) {
        const lobbyBeatmapStatusMessages: LobbyBeatmapStatusMessage[] = [];
        const leaderboardEvents: GameEvent[] = [];
        processor.buildLobbyStatusesGroupedByBeatmaps(game).forEach(bmLobbyGroup => {
          processor.buildMessages(bmLobbyGroup).forEach(message => {
            lobbyBeatmapStatusMessages.push(message);
          });
        });
        // TODO: Deliver messages
        leaderboardEvents.push(...processor.buildLeaderboardEvents(game));
        // TODO: build game report for game
        processor.buildGameReport(leaderboardEvents);
        // TODO: send reports only to games included in targetGameIds
      }
    }
  }
}
