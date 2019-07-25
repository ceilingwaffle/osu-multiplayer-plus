import { Repository, EntityRepository, getCustomRepository } from "typeorm";
import { DiscordUser } from "./discord-user.entity";

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
}
