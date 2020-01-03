import * as path from "path";
require("dotenv").config({
  path: path.resolve(__dirname, "../../../.env"),
  debug: process.env.DEBUG
});
import { User } from "../../domain/user/user.entity";
import { DiscordUser } from "../../domain/user/discord-user.entity";
import { Log } from "../../utils/log";
import { Seeder } from "../seeder";
import { Connection } from "typeorm";

export default class CreateUsersSeeder extends Seeder {
  public async run(connection: Connection): Promise<any> {
    try {
      Log.info("Seeding users...");

      const discordBotDiscordUser = new DiscordUser();
      discordBotDiscordUser.discordUserId = process.env.DISCORD_BOT_USER_ID;

      const user = new User();
      user.discordUser = discordBotDiscordUser;

      const savedUser = await user.save();

      Log.info("Saved user in DB:", savedUser);

      Log.methodSuccess(this.run, this.constructor.name);
    } catch (error) {
      Log.methodError(this.run, this.constructor.name, error);
      throw error;
    }
  }
}
