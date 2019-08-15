import { UserReportProperties } from "../shared/reports/user-report-properties.type";
import { Lobby } from "./lobby.entity";
import { AbstractResponseFactory } from "../shared/abstract-response-factory";

export class LobbyResponseFactory extends AbstractResponseFactory<Lobby> {
  getAddedBy(): UserReportProperties {
    return this.getUserReportPropertiesForUser(this.entity.addedBy);
  }

  getAddedAgoText(): string {
    return this.getTimeAgoTextForTime(this.entity.createdAt);
  }
}
