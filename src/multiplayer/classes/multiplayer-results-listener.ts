import { OsuLobbyScannerEventDataMap } from "../../osu/interfaces/osu-lobby-scanner-events";
import { Log } from "../../utils/log";
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
import { Leaderboard } from "../components/leaderboard";
import { VirtualMatchCreator } from "../virtual-match/virtual-match-creator";
import { ReportableContext } from "../reporting/reportable-context";
import { ReportableContextType } from "../reporting/reportable-context-type";

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
        this.doTheMpProcessing(apiMultiplayerResult);
      }

      Log.methodSuccess(this.handleNewMultiplayerMatches, this.constructor.name);
    } catch (error) {
      Log.methodError(this.handleNewMultiplayerMatches, this.constructor.name, error);
      throw error;
    }
  }

  async doTheMpProcessing(apiMultiplayerResult: ApiMultiplayer): Promise<void> {
    try {
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

        const matches: Match[] = (await this.matchService.getMatchesOfGame(game.id))
          .filter(m => m.endTime)
          .sort((a, b) => a.endTime - b.endTime);
        const virtualMatchReportDatas: VirtualMatchReportData[] = await processor.buildVirtualMatchReportGroupsForGame(game, matches);
        const { allReportables, toBeReported } = MultiplayerResultsReporter.getItemsToBeReported({
          virtualMatchReportDatas,
          game,
          matches
        });

        let reallyToBeReported: ReportableContext<ReportableContextType>[] = toBeReported;
        //temp fix to stop multiple results being delivered: only deliver the last beatmap result
        //    - will not include matches if the game has concluded (i.e. when only one team has >0 lives remaining)
        // reallyToBeReported = [];
        const latestMatch = matches.slice(-1)[0];
        if (latestMatch) {
          const latestMatchVmKey = VirtualMatchCreator.createSameBeatmapKeyObjectForMatch(latestMatch, matches);
          reallyToBeReported = toBeReported.filter(
            r => r.beatmapId == latestMatchVmKey.beatmapId && r.sameBeatmapNumber == latestMatchVmKey.sameBeatmapNumber
          );
        }

        Log.info(`Reportables: `, { allReportables: allReportables.length, reallyToBeReported: reallyToBeReported.length });
        await ReportablesDeliverer.deliver({ reportables: reallyToBeReported, gameMessageTargets: game.messageTargets, game });
      }
      Log.methodSuccess(this.doTheMpProcessing, this.constructor.name);
    } catch (error) {
      Log.methodError(this.doTheMpProcessing, this.constructor.name, error);
      throw error;
    }
  }
}
