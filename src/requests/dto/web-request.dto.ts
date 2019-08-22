import { RequestDto } from "./request.dto";

export interface WebRequestDto extends RequestDto {
  commType: "web";
}
