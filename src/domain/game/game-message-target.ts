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
  /**
   * The author of the original create-game command. This is used as a fallback message-target if the channel or Discord-server is deleted.
   *
   * @type {string}
   * @memberof GameMessageTarget
   */
  authorId: string;
}
