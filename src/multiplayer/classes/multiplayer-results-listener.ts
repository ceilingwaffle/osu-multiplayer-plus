import { OsuLobbyScannerEventDataMap } from "../../osu/interfaces/osu-lobby-scanner-events";
import { Log } from "../../utils/Log";
import { MultiplayerResultsProcessor } from "./multiplayer-results-processor";
import { VirtualMatchReportData } from "../virtual-match/virtual-match-report-data";
import Emittery = require("emittery");
import { ApiMultiplayer } from "../../osu/types/api-multiplayer";
import { Game } from "../../domain/game/game.entity";
import { injectable } from "inversify";
import { GameRepository } from "../../domain/game/game.repository";
import { getCustomRepository } from "typeorm";
import { MultiplayerResultsReporter } from "./multiplayer-results-reporter";
import { ReportablesDeliverer } from "./reportables-deliverer";
import { GameStatus } from "../../domain/game/game-status";
import { MatchService } from "../../domain/match/match.service";
import iocContainer from "../../inversify.config";
import TYPES from "../../types";
import { Match } from "../../domain/match/match.entity";

@injectable()
export class MultiplayerResultsListener {
  // private readonly gameRepository: GameRepository = getCustomRepository(GameRepository);
  public readonly eventEmitter: Emittery.Typed<OsuLobbyScannerEventDataMap> = new Emittery.Typed<OsuLobbyScannerEventDataMap>();
  private matchService: MatchService = iocContainer.get<MatchService>(TYPES.MatchService);

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
        Log.info("Event newMultiplayerMatches (buffer)", {
          mpid: apiMultiplayerResult.multiplayerId,
          matchesCount: apiMultiplayerResult.matches.length,
          targetGameIds: apiMultiplayerResult.targetGameIds?.size ? Array.from(apiMultiplayerResult.targetGameIds) : []
        });

        const processor = new MultiplayerResultsProcessor(apiMultiplayerResult);
        const multiplayerGames: Game[] = await processor.saveMultiplayerEntities();

        for (const game of multiplayerGames) {
          if (GameStatus.isEndedStatus(game.status)) {
            Log.info(`Skipping handling of new MP results for game ${game.id} due to game having ended status.`);
            continue;
          }

          const matches: Match[] = await this.matchService.getMatchesOfGame(game.id);
          const virtualMatchReportDatas: VirtualMatchReportData[] = await processor.buildVirtualMatchReportGroupsForGame(game, matches);
          const { toBeReported } = MultiplayerResultsReporter.getItemsToBeReported({ virtualMatchReportDatas, game, matches });
          await ReportablesDeliverer.deliver({ reportables: toBeReported, gameMessageTargets: game.messageTargets });
        }
      }

      Log.methodSuccess(this.handleNewMultiplayerMatches, this.constructor.name);
    } catch (error) {
      Log.methodError(this.handleNewMultiplayerMatches, this.constructor.name, error);
      throw error;
    }
  }
}
