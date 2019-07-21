require("typeorm");
import * as path from "path";
import iocContainer from "./inversify.config";
import * as entities from "./inversify.entities";
import { Message } from "./utils/message";
import { RequesterType } from "./requests/requester-type";
import { ConnectionManager } from "./utils/connection-manager";

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

Message.enableSentenceCaseOutput();

(() => {
  setTimeout(async () => {
    try {
      // create typeorm connection
      await ConnectionManager.getInstance();

      const gameController = iocContainer.get(entities.GameController);
      const response = await gameController.create({
        gameDto: { teamLives: 2, countFailedScores: true },
        requestDto: { type: RequesterType.DISCORD.toString(), authorId: "waffle", originChannel: "waffle's amazing channel" }
      });
      var a = response;
    } catch (e) {
      console.error(e);
    }
  }, (2 ^ 32) - 1);
})();

export {};
