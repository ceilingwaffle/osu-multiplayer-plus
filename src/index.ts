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

import iocContainer from "./inversify.config";
import * as entities from "./inversify.entities";
import { Message } from "./utils/message";
import { ConnectionManager } from "./utils/connection-manager";
import { DiscordBot } from "./discord/discord-bot";
import { OsuLobbyWatcher } from "./osu/osu-lobby-watcher";
import { Log } from "./utils/Log";

Message.enableSentenceCaseOutput();

if (process.env.NODE_ENV !== "test")
  (() => {
    setTimeout(async () => {
      try {
        // // create typeorm connection
        // await ConnectionManager.getInstance();

        // const gameController = iocContainer.get(entities.GameController);
        // const response = await gameController.create({
        //   gameDto: { teamLives: 2, countFailedScores: true },
        //   requestDto: { type: "discord", authorId: "waffle", originChannel: "waffle's amazing channel" }
        // });
        // var game = response;

        // if (game.success) {
        //   const gameId = game.result.gameId;

        //   const watcher = new OsuLobbyWatcher();
        //   watcher.watch({ banchoMultiplayerId: "53933822", gameId: gameId });
        // }

        const discordBot = new DiscordBot();
        discordBot.start(process.env.DISCORD_BOT_TOKEN);
      } catch (e) {
        Log.error(e);
      }
    }, (2 ^ 32) - 1);
  })();

export {};
