import { Repository, EntityRepository, getCustomRepository } from "typeorm";
import { DiscordUser } from "./discord-user.entity";
import { User } from "./user.entity";

@EntityRepository(DiscordUser)
export class DiscordUserRepository extends Repository<DiscordUser> {
  /**
   * Finds a user by the ID of the Discord user (the real Discord API user - not our custom-defined DiscordUser entity).
   *
   * @param {string} discordUserId
   * @returns {Promise<DiscordUser>}
   */
  async findByDiscordUserId(discordUserId: string): Promise<DiscordUser> {
    return this.findOne({ discordUserId: discordUserId }, { relations: ["user"] });
  }

  async getOrCreateDiscordBotUser(): Promise<DiscordUser> {
    return (await this.findByDiscordUserId(process.env.DISCORD_BOT_USER_ID)) || (await this.createDiscordBotUser());
  }

  private async createDiscordBotUser(): Promise<DiscordUser> {
    const discordBotDiscordUser = new DiscordUser();
    discordBotDiscordUser.discordUserId = process.env.DISCORD_BOT_USER_ID;
    const user = new User();
    user.discordUser = discordBotDiscordUser;
    const savedUser = await user.save();
    const reloadedUser = await User.findOne({ id: savedUser.id }, { relations: ["discordUser", "discordUser.user"] });
    if (!reloadedUser || !reloadedUser.discordUser) {
      throw new Error("Error creating and saving the Discord Bot user.");
    }
    return reloadedUser.discordUser;
  }
}
