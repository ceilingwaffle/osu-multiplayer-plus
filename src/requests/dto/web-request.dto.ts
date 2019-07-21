import { IRequestDto } from "./request.dto";

export interface WebRequestDto extends IRequestDto {
  type: "web";
}
