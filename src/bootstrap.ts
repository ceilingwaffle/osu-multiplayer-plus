import iocContainer from "./inversify.config";
import TYPES from "./types";
import { GameEventRegistrarInitializer } from "./multiplayer/game-events/classes/game-event-registrar-initializer";
import { Message } from "./utils/message";
import { Connection } from "typeorm";
import { IDbClient } from "./database/db-client";
import { IEventDispatcher } from "./events/interfaces/event-dispatcher";
import { DiscordMultiplayerResultsDeliverableEventHandler } from "./events/handlers/discord-multiplayer-results-deliverable.event-handler";
import { MultiplayerResultsDeliverableEvent } from "./events/multiplayer-results-deliverable.event";
import { DiscordBot } from "./discord/discord-bot";

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

const registerEventHandlers = () => {
  const dispatcher = iocContainer.get<IEventDispatcher>(TYPES.IEventDispatcher);
  dispatcher.subscribe<MultiplayerResultsDeliverableEvent>(new DiscordMultiplayerResultsDeliverableEventHandler());
};

const initDatabaseClientConnection = async (): Promise<Connection> => {
  const dbClient = iocContainer.get<IDbClient>(TYPES.IDbClient);
  return await dbClient.connectIfNotConnected();
};

export const bootstrap = async (): Promise<void> => {
  Message.enableSentenceCaseOutput();
  await initDatabaseClientConnection();
  registerEventHandlers();
  await GameEventRegistrarInitializer.initGameEventRegistrarsFromActiveDatabaseGames();

  if (process.env.NODE_ENV !== "test") {
    const discordBot = iocContainer.get<DiscordBot>(TYPES.DiscordBot);
    await discordBot.start(process.env.DISCORD_BOT_TOKEN);
  }
};
