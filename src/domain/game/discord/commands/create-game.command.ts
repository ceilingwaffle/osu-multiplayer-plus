import { Command, CommandoClient, CommandMessage } from "discord.js-commando";
import { inject } from "inversify";
import { GameController } from "../../game.controller";
import { Message } from "discord.js";
import { ErrorDiscordMessageBuilder } from "../../../shared/discord/message-builders/error.discord-message-builder";
import { CreateGameDiscordMessageBuilder } from "../message-builders/create-game.discord-message-builder";

export class CreateGameCommand extends Command {
  constructor(commando: CommandoClient, @inject(GameController) protected readonly gameController: GameController) {
    super(commando, {
      name: "creategame",
      group: "osu",
      memberName: "creategame",
      description: "Creates a new Battle Royale game for one or more osu! multiplayer lobbies.",
      aliases: ["newgame", "makegame", "addgame"],
      examples: [],
      guildOnly: true, // accept commands from channels only, e.g. ignore DM commands
      argsPromptLimit: 0,
      args: [
        {
          key: "lives",
          prompt: "How many lives should each team start with?",
          type: "number"
        },
        {
          key: "countFailedScores",
          prompt: "Should failed scores be counted in the team score calculations?",
          type: "boolean"
        }
      ]
    });
  }

  public async run(
    message: CommandMessage,
    args: {
      lives: number;
      countFailedScores: boolean;
    }
  ): Promise<Message | Message[]> {
    const createGameResponse = await this.gameController.create({
      gameDto: {
        teamLives: args.lives,
        countFailedScores: args.countFailedScores
      },
      requestDto: {
        type: "discord",
        authorId: message.author.id,
        originChannel: message.channel.id
      }
    });

    if (!createGameResponse || !createGameResponse.success) {
      const toBeSent = new ErrorDiscordMessageBuilder().from(createGameResponse).buildDiscordMessage(message);
      return message.embed(toBeSent);
    }

    const toBeSent = new CreateGameDiscordMessageBuilder().from(createGameResponse).buildDiscordMessage(message);
    return message.embed(toBeSent);
  }
}
