import { Guild, TextChannel } from "discord.js";
import { Failure } from "../utils/failure";
import { DiscordFailureTypes, notPermittedManageChannelsFailure, unexpectedChannelTypeFailure } from "./discord.failure";
import { Response } from "../requests/response";
import { FailureMessage } from "../utils/message";

export class DiscordChannelManager {
  /**
   * Creates a Discord text-channel where messages related to the game will be delivered.
   *
   * @static
   * @param {number} gameId
   * @param {Guild} guild
   * @returns {Promise<Either<Failure<DiscordFailureTypes>, TextChannel>>}
   * @memberof DiscordChannelManager
   */
  static createGameChannel(gameId: number, guild: Guild): Promise<Response<TextChannel>> {
    return this.createTextChannel(`obr-game-${gameId}`, guild);
  }

  static async createTextChannel(channelName: string, guild: Guild): Promise<Response<TextChannel>> {
    if (!guild.me.hasPermission("MANAGE_CHANNELS")) {
      return {
        success: false,
        message: FailureMessage.get("discordChannelCreateFailed"),
        errors: {
          messages: [notPermittedManageChannelsFailure().reason]
        }
      };
    }

    const channel = await guild.createChannel(`${channelName}`, { type: "text" });

    if (!(channel instanceof TextChannel)) {
      return {
        success: false,
        message: FailureMessage.get("discordChannelCreateFailed"),
        errors: {
          messages: [unexpectedChannelTypeFailure().reason]
        }
      };
    }

    return {
      success: true,
      message: FailureMessage.get("discordChannelCreateSuccess"),
      result: channel
    };
  }
}
