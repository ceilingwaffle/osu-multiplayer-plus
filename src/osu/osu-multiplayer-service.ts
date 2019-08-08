import { Multi } from "./types/old/multi";
import { isNullOrUndefined } from "util";

export class OsuMultiplayerService {
  constructor(protected readonly processedResults?) {}

  processMultiplayerResults(results: Multi): OsuMultiplayerService {
    const processedResults = null; // TODO
    return new OsuMultiplayerService(processedResults);
  }

  buildReport(): TeamScoresReport {
    if (!this.hasProcessedResults()) {
      throw new Error("Must process results before building report.");
    }

    return this.scoringService.buildReport(this.processedResults);
  }

  private hasProcessedResults(): boolean {
    return !isNullOrUndefined(this.processedResults);
  }
}
