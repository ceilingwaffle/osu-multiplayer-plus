import iocContainer from "../../../../inversify.config";
import { Command, CommandoClient, CommandMessage } from "discord.js-commando";
import { GameController } from "../../game.controller";
import { Message, RichEmbed } from "discord.js";
import { ErrorDiscordMessageBuilder } from "../../../../discord/message-builders/error.discord-message-builder";
import { CreateGameDiscordMessageBuilder } from "../message-builders/create-game.discord-message-builder";
import * as entities from "../../../../inversify.entities";

export class CreateGameCommand extends Command {
  // @inject(GameController) protected readonly gameController: GameController
  protected readonly gameController: GameController = iocContainer.get(entities.GameController);

  constructor(commando: CommandoClient) {
    super(commando, {
      name: "creategame",
      group: "osu",
      memberName: "creategame",
      description:
        "Creates a new osu! Battle Royale game. You can then add multiplayer lobbies from which match scores will be calculated.",
      aliases: [],
      examples: ["!obr creategame 2 true"], // new DiscordCommandExampleBuilder(this).getAll()
      guildOnly: true, // accept commands from channels only, e.g. ignore DM commands
      argsPromptLimit: 0,
      args: [
        {
          key: "lives",
          prompt: "How many lives should each team start with?",
          type: "integer",
          default: 2
        },
        {
          key: "countFailedScores",
          prompt: "Should failed scores be counted in the team score calculations?",
          type: "boolean",
          default: true
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

    let toBeSent: RichEmbed;
    if (!createGameResponse || !createGameResponse.success) {
      toBeSent = new ErrorDiscordMessageBuilder().from(createGameResponse, this).buildDiscordMessage(message);
    } else {
      toBeSent = new CreateGameDiscordMessageBuilder().from(createGameResponse, this).buildDiscordMessage(message);
    }

    return message.embed(toBeSent);
  }
}
