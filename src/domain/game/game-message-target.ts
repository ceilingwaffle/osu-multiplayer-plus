import { CommunicationClientType } from "../../requests/dto/request.dto";

export interface GameMessageTarget {
  type: CommunicationClientType;
  // authorId: string;
  channelId: string;
}
