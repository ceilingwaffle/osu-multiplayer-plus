import { OsuLobbyScannerEventDataMap } from "../osu/interfaces/osu-lobby-scanner-events";
import { Log } from "../utils/Log";
import { GameReport } from "./reports/game.report";
import { MultiplayerResultsProcessor } from "./multiplayer-results-processor";
import { VirtualBeatmap } from "./virtual-beatmap";
import Emittery = require("emittery");
import { ApiMultiplayer } from "../osu/types/api-multiplayer";
import { Game } from "../domain/game/game.entity";
import { GameEvent } from "./game-events/game-event";
import { Match } from "../domain/match/match.entity";
import { injectable } from "inversify";
import { GameRepository } from "../domain/game/game.repository";
import { getCustomRepository } from "typeorm";
import { Lobby } from "../domain/lobby/lobby.entity";
import { LobbyBeatmapStatusMessageTypes } from "./lobby-beatmap-status-message";

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
          const leaderboardEvents: GameEvent[] = [];
          const bmLobbyGroups = processor.buildBeatmapsGroupedByLobbyPlayedStatusesForGame(game);
          const allGameLobbies: Lobby[] = game.gameLobbies.map(gl => gl.lobby);
          const lobbyBeatmapStatusMessages: LobbyBeatmapStatusMessageTypes[] =
            processor.buildLobbyMatchReportMessages({ beatmapsPlayed: bmLobbyGroups, reportedMatches, allGameLobbies }) || [];
          // TODO: Deliver messages
          leaderboardEvents.push(...processor.buildLeaderboardEvents(game));
          // TODO: build game report for game
          processor.buildGameReport(leaderboardEvents);
          // TODO: send reports only to games included in targetGameIds

          /* 
          - MultiplayerResultsListener -> Receives osu! api data
                                       -> Processes the osu api data into multiplayer objects
                                       -> emit "osuApiDataReceived" for game[], lobby, match[]
                                       -> Processing the team calculations (winner, loser, eliminated, time completed, etc
                                       -> Emits the team calculations event
          - MessageBuilder        -> 
                                  -> Build the LobbyCompletedBeatmapMessage (needs winner, loser, eliminated, time completed, etc)
                                  -> Deliver the LobbyCompletedBeatmapMessage to the GameMessageTarget (needs message, game, )]
          - DiscordMessageDeliverer -> Listens for event
                                  -> 
                                  ->

- leaderboard (includes team scores/positions)
- game events
- game messages


          */
        }
      }
      Log.methodSuccess(this.handleNewMultiplayerMatches, this.constructor.name);
    } catch (error) {
      Log.methodError(this.handleNewMultiplayerMatches, this.constructor.name, error);
      throw error;
    }
  }
}
