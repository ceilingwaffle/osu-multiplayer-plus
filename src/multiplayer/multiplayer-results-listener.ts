import { OsuLobbyScannerEventDataMap } from "../osu/interfaces/osu-lobby-scanner-events";
import { Log } from "../utils/Log";
import { GameReport } from "./reports/game.report";
import { MultiplayerResultsProcessor } from "./multiplayer-results-processor";
import Emittery = require("emittery");
import { ApiMultiplayer } from "../osu/types/api-multiplayer";

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
    const bufferedMultis: AsyncIterableIterator<ApiMultiplayer> = this.eventEmitter.events("newMultiplayerMatches");
    for await (const multi of bufferedMultis) {
      Log.warn("Event newMultiplayerMatches (buffer)", { mpid: multi.multiplayerId, matches: multi.matches.length });
      // const matchReports: MatchReport[] = await new MultiplayerResultsProcessor(multi).process().buildReport();
      // console.log(matchReports);
    }
  }
}
