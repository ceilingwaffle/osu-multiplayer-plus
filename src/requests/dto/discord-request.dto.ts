import { RequestDto } from "./request.dto";

export interface DiscordRequestDto extends RequestDto {
  commType: "discord";
}
