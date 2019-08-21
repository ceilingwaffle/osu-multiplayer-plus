import { DiscordRequestDto } from "./discord-request.dto";
import { WebRequestDto } from "./web-request.dto";

export interface RequestDto {
  type: CommunicationClientType;
  authorId: string;
  originChannelId: string;
}

export type RequestDtoType = DiscordRequestDto | WebRequestDto;

export type CommunicationClientType = "discord" | "web";
