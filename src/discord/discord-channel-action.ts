interface DiscordChannelAction {
  action: "create" | "update" | "delete";
  /**
   * The Discord channel-category ID where the channel exists.
   *
   * @type {string}
   * @memberof DiscordChannelAction
   */
  categoryId?: string;
  /**
   * The Discord channel ID.
   *
   * @type {string}
   * @memberof DiscordChannelAction
   */
  channelId?: string;
  /**
   * The Discord channel-type.
   *
   * See: https://discord.js.org/#/docs/main/stable/class/GuildChannel?scrollTo=type
   *
   * @type {("text" | "category")}
   * @memberof DiscordChannelAction
   */
  channelType?: "text" | "category";
  /**
   * The properties of the thing being acted upon (e.g. the channel name).
   *
   * @type {DiscordChannelProperties}
   * @memberof DiscordChannelAction
   */
  properties?: DiscordChannelProperties;
}

export interface DiscordChannelActionCreate extends DiscordChannelAction {
  action: "create";
  channelType: "text";
  properties: {
    name: string;
  };
}

export interface DiscordChannelActionUpdate extends DiscordChannelAction {
  action: "update";
  channelId: string;
  properties: {
    name: string;
  };
}

export interface DiscordChannelActionDelete extends DiscordChannelAction {
  action: "delete";
  channelId: string;
}

interface DiscordChannelProperties {
  /**
   * The name of the thing being acted upon (e.g. text channel name, or channel-category name).
   *
   * @type {string}
   * @memberof DiscordChannelAction
   */
  name?: string;
}
