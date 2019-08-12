import { UserReportProperties } from "../shared/reports/user-report-properties.type";
import { Requester } from "../../requests/requesters/requester";
import { Game } from "./game.entity";
import { GameMessageTarget } from "./game-message-target";
import { RequestDto } from "../../requests/dto";
import * as moment from "moment";
import { User } from "../user/user.entity";

export class GameResponseFactory {
  constructor(protected readonly requester: Requester, protected readonly game: Game, protected readonly requestData: RequestDto) {}

  getCreator(): UserReportProperties {
    return this.getUserReportPropertiesForUser(this.game.createdBy);
  }

  getEndedBy(): UserReportProperties {
    return this.getUserReportPropertiesForUser(this.game.endedBy);
  }

  getReferees(): UserReportProperties[] {
    return this.game.refereedBy.map(user => this.getUserReportPropertiesForUser(user));
  }

  getMessageTargets(): GameMessageTarget[] {
    return [{ type: this.requestData.type, authorId: this.requestData.authorId, channel: this.requestData.originChannel }];
  }

  getCreatedAgoText(): string {
    return this.getTimeAgoTextForTime(this.game.createdAt);
  }

  getEndedAgoText(): string {
    return this.getTimeAgoTextForTime(this.game.endedAt);
  }

  private getUserReportPropertiesForUser(user: User): UserReportProperties {
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

  private getTimeAgoTextForTime(time: number): string {
    return moment.unix(time).fromNow();
  }
}
