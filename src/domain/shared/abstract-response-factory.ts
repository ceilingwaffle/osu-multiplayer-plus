import { User } from "../user/user.entity";
import { UserReportProperties } from "./reports/user-report-properties.type";
import moment = require("moment");
import { Requester } from "../../requests/requesters/requester";
import { RequestDto } from "../../requests/dto";

export class AbstractResponseFactory<T> {
  constructor(protected readonly requester: Requester, protected readonly entity: T, protected readonly requestData: RequestDto) {}

  protected getUserReportPropertiesForUser(user: User): UserReportProperties {
    if (this.requester.dto.type === "discord") {
      return { discordUserId: user.discordUser.discordUserId };
    } else if (this.requester.dto.type === "web") {
      throw new Error("Web user not implemented.");
      // return { discordUserId: this.game.createdBy.webUser.webUuid };
    } else {
      const _exhaustiveCheck: never = this.requester.dto.type;
      return _exhaustiveCheck;
    }
  }

  protected getTimeAgoTextForTime(time: number): string {
    return moment.unix(time).fromNow();
  }
}