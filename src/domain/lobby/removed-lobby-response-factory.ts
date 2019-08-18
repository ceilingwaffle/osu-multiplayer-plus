import { UserReportProperties } from "../shared/reports/user-report-properties.type";
import { AbstractResponseFactory } from "../shared/abstract-response-factory";
import { RemovedLobbyResult } from "./removed-lobby-result";

export class RemovedLobbyResponseFactory extends AbstractResponseFactory<RemovedLobbyResult> {
  getGameId(): number {
    return this.subject.gameIdRemovedFrom;
  }

  getRemovedBy(): UserReportProperties {
    return this.getUserReportPropertiesForUser(this.subject.lobby.removedBy);
  }

  getRemovedAgoText(): string {
    return this.getTimeAgoTextForTime(this.subject.lobby.removedAt);
  }
}
