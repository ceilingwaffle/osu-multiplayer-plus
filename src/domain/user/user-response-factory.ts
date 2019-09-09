import { UserReportProperties } from "../shared/reports/user-report-properties.type";
import { AbstractResponseFactory } from "../shared/abstract-response-factory";
import { User } from "./user.entity";

export class UserResponseFactory extends AbstractResponseFactory<User> {
  getUpdatedBy(): UserReportProperties {
    // for now, just assume the user is the only one to update itself
    return this.getUserReportPropertiesForUser(this.subject);
  }

  getUpdatedAgoText(): string {
    return this.getTimeAgoTextForTime(this.subject.updatedAt);
  }

  getTargetGameId(): number {
    if (!this.subject || !this.subject.targetGame) {
      return null;
    }
    return this.subject.targetGame.id;
  }
}
