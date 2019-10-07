import "reflect-metadata";
import { DiscordBot } from "./discord/discord-bot";
import { Log } from "./utils/Log";
import { bootstrap } from "./bootstrap";

Log.info("App starting...");

setTimeout(async () => {
  try {
    await bootstrap();

    if (process.env.NODE_ENV !== "test") {
      const discordBot = new DiscordBot();
      await discordBot.start(process.env.DISCORD_BOT_TOKEN);
    }
  } catch (e) {
    Log.error(e);
  }
}, (2 ^ 32) - 1);

export {};
