import { IRequestDto } from "./request.dto";

export interface DiscordRequestDto extends IRequestDto {
  type: "discord";
}
