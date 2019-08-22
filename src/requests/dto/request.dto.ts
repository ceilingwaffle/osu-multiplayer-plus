import { DiscordRequestDto } from "./discord-request.dto";
import { WebRequestDto } from "./web-request.dto";
import { CommunicationClientType } from "../../communication-types";

export interface RequestDto {
  commType: CommunicationClientType;
  authorId: string;
  originChannelId: string;
}

export type RequestDtoType = DiscordRequestDto | WebRequestDto;
