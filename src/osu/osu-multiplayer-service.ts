import { isNullOrUndefined } from "util";
import { Multiplayer } from "./types/multiplayer";

export class OsuMultiplayerService {
  constructor(protected readonly processedResults?) {}

  processMultiplayerResults(results: Multiplayer): OsuMultiplayerService {
    const processedResults = null; // TODO
    return new OsuMultiplayerService(processedResults);
  }

  // TODO: change to returns TeamScoresReport
  buildReport(): any {
    if (!this.hasProcessedResults()) {
      throw new Error("Must process results before building report.");
    }

    // return this.scoringService.buildReport(this.processedResults);
  }

  private hasProcessedResults(): boolean {
    return !isNullOrUndefined(this.processedResults);
  }
}
