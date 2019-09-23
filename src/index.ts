import "reflect-metadata";
import * as path from "path";

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
  debug: process.env.DEBUG
});

declare global {
  interface String {
    toSentenceCase(): string;
  }
}

String.prototype.toSentenceCase = function(): string {
  var rg = /(^\w{1}|\.\s*\w{1})/gi;
  var sentence = this.replace(rg, function(toReplace) {
    return toReplace.toUpperCase();
  });
  sentence = sentence.trim();
  if (sentence.substr(sentence.length - 1, 1) !== ".") {
    sentence += ".";
  }
  return sentence;
};

import { Message } from "./utils/message";
import { DiscordBot } from "./discord/discord-bot";
import { Log } from "./utils/Log";
import { GameEventRegistrarInitializer } from "./multiplayer/game-events/game-event-registrar-initializer";

Message.enableSentenceCaseOutput();

Log.info("App starting...");

(() => {
  setTimeout(async () => {
    try {
      await GameEventRegistrarInitializer.initGameEventRegistrarsFromActiveDatabaseGames();

      if (process.env.NODE_ENV !== "test") {
        const discordBot = new DiscordBot();
        await discordBot.start(process.env.DISCORD_BOT_TOKEN);
      }
    } catch (e) {
      Log.error(e);
    }
  }, (2 ^ 32) - 1);
})();

export {};
