import iocContainer from "../../inversify.config";
import { CommandoClient, CommandMessage } from "discord.js-commando";
import { GameController } from "../../domain/game/game.controller";
import { Message, RichEmbed } from "discord.js";
import { ErrorDiscordMessageBuilder } from "../message-builders/error.discord-message-builder";
import * as entities from "../../inversify.entities";
import { EndGameDiscordMessageBuilder } from "../message-builders/end-game.discord-message-builder";
import { AppBaseCommand } from "./app-base-command";

export class EndGameCommand extends AppBaseCommand {
  // @inject(GameController) protected readonly gameController: GameController
  protected readonly gameController: GameController = iocContainer.get(entities.GameController);

  constructor(commando: CommandoClient) {
    super(commando, {
      name: "endgame",
      group: "osu",
      memberName: "endgame",
      description:
        "Manually ends an osu! Battle Royale game. Games are normally ended automatically, but you can use this command to end one early.",
      aliases: [],
      examples: ["!obr endgame 5"],
      guildOnly: true, // accept commands from channels only, e.g. ignore DM commands
      argsPromptLimit: 0,
      args: [
        {
          key: "gameID",
          prompt: "The ID number of the game to be ended.",
          type: "integer"
        }
      ]
    });
  }

  public async run(
    message: CommandMessage,
    args: {
      gameID: number;
    }
  ): Promise<Message | Message[]> {
    if (!(await this.confirm(message.message))) return;

    const endGameResponse = await this.gameController.endGame({
      endGameDto: {
        gameId: args.gameID
      },
      requestDto: {
        commType: "discord",
        authorId: message.author.id,
        originChannelId: message.channel.id
      }
    });

    let toBeSent: RichEmbed;
    if (!endGameResponse || !endGameResponse.success) {
      toBeSent = new ErrorDiscordMessageBuilder().from(endGameResponse, this).buildDiscordMessage(message);
    } else {
      toBeSent = new EndGameDiscordMessageBuilder().from(endGameResponse, this).buildDiscordMessage(message);
    }

    return message.embed(toBeSent);
  }
}
