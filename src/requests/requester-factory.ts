import iocContainer from "../inversify.config";
import { RequestDtoType } from "./dto/request.dto";
import { Requester } from "./requesters/requester";
import * as entities from "../inversify.entities";
import { DiscordRequester } from "./requesters/discord.requester";
import { WebRequester } from "./requesters/web.requester";

export class RequesterFactory {
  /**
   * Returns an instance of a specific Requester type depending on the given DTO type.
   *
   * @static
   * @param {RequestDtoType} requestDto
   * @returns {Requester}
   */
  public static initialize(requestDto: RequestDtoType): Requester {
    if (requestDto.type === "discord") {
      return new DiscordRequester(requestDto, iocContainer.get(entities.UserService));
    } else if (requestDto.type === "web") {
      return new WebRequester(requestDto, iocContainer.get(entities.UserService));
    } else {
      const _exhaustiveCheck: never = requestDto;
      return _exhaustiveCheck;
    }
  }
}
