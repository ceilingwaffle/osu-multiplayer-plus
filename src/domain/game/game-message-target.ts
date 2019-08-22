import { CommunicationClientType, CommunicationChannelType } from "../../communication-types";

export interface GameMessageTarget {
  commType: CommunicationClientType;
  /**
   * The target channel ID (e.g. Discord channel ID).
   *
   * @type {string}
   */
  channelId: string;
  channelType: CommunicationChannelType;
  // authorId: string;
}
