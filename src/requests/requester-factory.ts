import { Requester } from "./requesters/requester";
import { RequesterType } from "./requester-type";
import iocContainer from "../inversify.config";
import * as entities from "../inversify.entities";
import { RequestDto } from "../domain/shared/dto/request.dto";

export class RequesterFactory {
  public static initialize(requesterType: string): Requester {
    if (requesterType === RequesterType.DISCORD.toString()) {
      return iocContainer.get(entities.DiscordRequester);
    }

    if (requesterType === RequesterType.WEB.toString()) {
      return iocContainer.get(entities.WebRequester);
    }

    throw new Error("Unhandled requester type.");
  }
}
