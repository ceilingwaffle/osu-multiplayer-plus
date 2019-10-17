import iocContainer from "./inversify.config";
import { GameEventRegistrarInitializer } from "./multiplayer/game-events/game-event-registrar-initializer";
import { Message } from "./utils/message";
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

export const bootstrap = async (): Promise<void> => {
  Message.enableSentenceCaseOutput();
  await iocContainer.initDatabaseClientConnection();
  await GameEventRegistrarInitializer.initGameEventRegistrarsFromActiveDatabaseGames();
};
