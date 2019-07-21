import iocContainer from "../inversify.config";
import { RequestDto } from "./dto/request.dto";
import { Requester } from "./requesters/requester";
import * as entities from "../inversify.entities";
import { DiscordRequester } from "./requesters/discord.requester";
import { WebRequester } from "./requesters/web.requester";

export class RequesterFactory {
  public static initialize(requestDto: RequestDto): Requester {
    let requester: Requester;
    if (requestDto.type === "discord") {
      requester = new DiscordRequester(requestDto, iocContainer.get(entities.UserService));
    } else if (requestDto.type === "web") {
      requester = new WebRequester(requestDto, iocContainer.get(entities.UserService));
    } else {
      const _exhaustiveCheck: never = requestDto;
    }

    return requester;
  }
}
