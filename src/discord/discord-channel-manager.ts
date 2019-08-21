import { Guild, TextChannel } from "discord.js";
import { Either, failurePromise, successPromise } from "../utils/Either";
import { Failure } from "../utils/Failure";
import { DiscordFailureTypes, notPermittedManageChannelsFailure, unexpectedChannelTypeFailure } from "./discord.failure";

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
  static createGameChannel(gameId: number, guild: Guild): Promise<Either<Failure<DiscordFailureTypes>, TextChannel>> {
    return this.createTextChannel(`obr-game-${gameId}`, guild);
  }

  static async createTextChannel(channelName: string, guild: Guild): Promise<Either<Failure<DiscordFailureTypes>, TextChannel>> {
    if (!guild.me.hasPermission("MANAGE_CHANNELS")) {
      return failurePromise(notPermittedManageChannelsFailure());
    }

    const channel = await guild.createChannel(`${channelName}`, { type: "text" });
    if (!(channel instanceof TextChannel)) {
      return failurePromise(unexpectedChannelTypeFailure());
    }

    return successPromise(channel);
  }
}
