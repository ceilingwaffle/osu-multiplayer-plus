import "reflect-metadata";
import { DiscordBot } from "./discord/discord-bot";
import { Log } from "./utils/Log";
import { startup } from "./startup";

Log.info("App starting...");

setTimeout(async () => {
  try {
    await startup();

    if (process.env.NODE_ENV !== "test") {
      const discordBot = new DiscordBot();
      await discordBot.start(process.env.DISCORD_BOT_TOKEN);
    }
  } catch (e) {
    Log.error(e);
  }
}, (2 ^ 32) - 1);

export {};
