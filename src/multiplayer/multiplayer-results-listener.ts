import { OsuLobbyScannerEventDataMap } from "../osu/interfaces/osu-lobby-scanner-events";
import { Log } from "../utils/Log";
import { GameReport } from "./reports/game.report";
import { MultiplayerResultsProcessor } from "./multiplayer-results-processor";
import { BeatmapLobbyPlayedStatusGroup } from "./beatmap-lobby-played-status-group";
import Emittery = require("emittery");
import { ApiMultiplayer } from "../osu/types/api-multiplayer";
import { Game } from "../domain/game/game.entity";
import { GameEvent } from "./game-events/game-event";
import { Match } from "../domain/match/match.entity";
import { LobbyBeatmapStatusMessage } from "./lobby-beatmap-status-message";
import { injectable } from "inversify";
import { GameRepository } from "../domain/game/game.repository";
import { getCustomRepository } from "typeorm";
import { Lobby } from "../domain/lobby/lobby.entity";

@injectable()
export class MultiplayerResultsListener {
  private readonly gameRepository: GameRepository = getCustomRepository(GameRepository);
  public readonly eventEmitter: Emittery.Typed<OsuLobbyScannerEventDataMap> = new Emittery.Typed<OsuLobbyScannerEventDataMap>();

  constructor() {
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
    try {
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
          const reportedMatches: Match[] = (await this.gameRepository.getReportedMatchesForGame(game.id)) || [];
          const lobbyBeatmapStatusMessages: LobbyBeatmapStatusMessage[] = [];
          const leaderboardEvents: GameEvent[] = [];
          const bmLobbyGroups = processor.buildBeatmapsGroupedByLobbyPlayedStatusesForGame(game);
          const allGameLobbies: Lobby[] = game.gameLobbies.map(gl => gl.lobby);
          const messages: LobbyBeatmapStatusMessage[] =
            processor.buildLobbyMatchReportMessages({ beatmapsPlayed: bmLobbyGroups, reportedMatches, allGameLobbies }) || [];
          for (const message of messages) lobbyBeatmapStatusMessages.push(message);
          // TODO: Deliver messages
          leaderboardEvents.push(...processor.buildLeaderboardEvents(game));
          // TODO: build game report for game
          processor.buildGameReport(leaderboardEvents);
          // TODO: send reports only to games included in targetGameIds
        }
      }
      Log.methodSuccess(this.handleNewMultiplayerMatches, this.constructor.name);
    } catch (error) {
      Log.methodError(this.handleNewMultiplayerMatches, this.constructor.name, error);
      throw error;
    }
  }
}
