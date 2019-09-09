import { TYPES } from "../types";
import getDecorators from "inversify-inject-decorators";
import iocContainer from "../inversify.config";
const { lazyInject } = getDecorators(iocContainer);
import { RequestDtoType } from "./dto/request.dto";
import { Requester } from "./requesters/requester";
import { DiscordRequester } from "./requesters/discord.requester";
import { WebRequester } from "./requesters/web.requester";
import { UserService } from "../domain/user/user.service";
import { injectable, inject } from "inversify";

@injectable()
export class RequesterFactory {
  constructor(@inject(TYPES.UserService) protected readonly userService: UserService) {}

  /**
   * Returns an instance of a specific Requester type depending on the given DTO type.
   *
   * @static
   * @param {RequestDtoType} requestDto
   * @returns {Requester}
   */
  public create(requestDto: RequestDtoType): Requester {
    if (requestDto.commType === "discord") {
      return new DiscordRequester(requestDto, this.userService);
    } else if (requestDto.commType === "web") {
      return new WebRequester(requestDto, this.userService);
    } else {
      const _exhaustiveCheck: never = requestDto;
      return _exhaustiveCheck;
    }
  }
}
