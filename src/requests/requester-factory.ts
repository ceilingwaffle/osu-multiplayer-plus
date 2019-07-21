import { Requester } from "./requesters/requester";
import { RequesterType } from "./requester-type";
import iocContainer from "../inversify.config";
import * as entities from "../inversify.entities";
import { RequestDto } from "./dto/request.dto";

export class RequesterFactory {
  public static initialize(requestDto: RequestDto): Requester {
    let requester: Requester;
    if (requestDto.type === RequesterType.DISCORD.toString()) {
      requester = iocContainer.get(entities.DiscordRequester);
    } else if (requestDto.type === RequesterType.WEB.toString()) {
      requester = iocContainer.get(entities.WebRequester);
    } else {
      throw new Error("Unhandled requester type.");
    }

    requester.requesterInfo.authorId = requestDto.authorId;
    requester.requesterInfo.originChannel = requestDto.originChannel;

    return requester;
  }
}
