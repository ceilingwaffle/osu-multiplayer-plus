import { DiscordRequestDto } from "./discord-request.dto";
import { WebRequestDto } from "./web-request.dto";

export interface IRequestDto {
  type: string;
  authorId: string;
  originChannel: string;
}

export type RequestDto = DiscordRequestDto | WebRequestDto;
