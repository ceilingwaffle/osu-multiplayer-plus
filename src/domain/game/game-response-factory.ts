import { UserReportProperties } from "../shared/reports/user-report-properties.type";
import { Game } from "./game.entity";
import { GameMessageTarget } from "./game-message-target";
import { AbstractResponseFactory } from "../shared/abstract-response-factory";

export class GameResponseFactory extends AbstractResponseFactory<Game> {
  getCreator(): UserReportProperties {
    return this.getUserReportPropertiesForUser(this.entity.createdBy);
  }

  getEndedBy(): UserReportProperties {
    return this.getUserReportPropertiesForUser(this.entity.endedBy);
  }

  getReferees(): UserReportProperties[] {
    return this.entity.refereedBy.map(user => this.getUserReportPropertiesForUser(user));
  }

  getMessageTargets(): GameMessageTarget[] {
    return [{ type: this.requestData.type, authorId: this.requestData.authorId, channel: this.requestData.originChannel }];
  }

  getCreatedAgoText(): string {
    return this.getTimeAgoTextForTime(this.entity.createdAt);
  }

  getEndedAgoText(): string {
    return this.getTimeAgoTextForTime(this.entity.endedAt);
  }
}
