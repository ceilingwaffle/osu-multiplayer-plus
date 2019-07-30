import { UserReportProperties } from "../shared/reports/user-report-properties.type";
import { Requester } from "../../requests/requesters/requester";
import { Game } from "./game.entity";
import { GameMessageTarget } from "./game-message-target";
import { RequestDto } from "../../requests/dto";

export class GameResponseFactory {
  constructor(protected readonly requester: Requester, protected readonly game: Game, protected readonly requestData: RequestDto) {}

  getCreator(): UserReportProperties {
    if (this.requester.dto.type === "discord") {
      return { discordUserId: this.game.createdBy.discordUser.discordUserId };
    } else if (this.requester.dto.type === "web") {
      throw new Error("Web user not implemented.");
      // return { discordUserId: this.game.createdBy.webUser.webUuid };
    } else {
      const _exhaustiveCheck: never = this.requester.dto.type;
      return _exhaustiveCheck;
    }
  }

  getReferees(): UserReportProperties[] {
    if (this.requester.dto.type === "discord") {
      return this.game.refereedBy.map<UserReportProperties>(user => {
        return { discordUserId: user.discordUser.discordUserId };
      });
    } else if (this.requester.dto.type === "web") {
      throw new Error("Web user not implemented.");
      // return this.game.refereedBy.map<UserReportProperties>(user => {
      //   return { webUuid: user.webUser.webUuid };
      // });
    } else {
      const _exhaustiveCheck: never = this.requester.dto.type;
      return _exhaustiveCheck;
    }
  }

  getMessageTargets(): GameMessageTarget[] {
    return [{ type: this.requestData.type, authorId: this.requestData.authorId, channel: this.requestData.originChannel }];
  }
}
