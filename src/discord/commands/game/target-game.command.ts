import iocContainer from "../../../inversify.config";
import { TYPES } from "../../../types";
import { Command, CommandoClient, CommandMessage } from "discord.js-commando";
import { UserController } from "../../../domain/user/user.controller";
import { Message, RichEmbed } from "discord.js";
import { DiscordRequestDto } from "../../../requests/dto";
import { ErrorDiscordMessageBuilder } from "../../message-builders/error.discord-message-builder";
import { TargetGameDiscordMessageBuilder } from "../../message-builders/user/target-game.discord-message-builder";

export class TargetGameCommand extends Command {
  private userController = iocContainer.get<UserController>(TYPES.UserController);

  constructor(commando: CommandoClient) {
    super(commando, {
      name: "targetgame",
      group: "osu",
      memberName: "targetgame",
      description: "Sets a game ID as the target game of the user's future commands.",
      examples: ["!obr targetgame 1"],
      guildOnly: true,
      argsPromptLimit: 0,
      aliases: ["gametarget", "setgame", "gameset"],
      args: [
        {
          key: "gameId",
          prompt: "The ID number of the game to be targeted.",
          type: "integer"
        }
      ]
    });
  }

  public async run(
    message: CommandMessage,
    args: {
      gameId: number;
    }
  ): Promise<Message | Message[]> {
    const requestDto: DiscordRequestDto = {
      commType: "discord",
      authorId: message.author.id,
      originChannelId: message.channel.id
    };

    const updateGameResponse = await this.userController.update({
      userDto: { targetGameId: args.gameId },
      requestDto: requestDto
    });

    let toBeSent: RichEmbed;
    if (!updateGameResponse || !updateGameResponse.success) {
      // game was not created
      toBeSent = new ErrorDiscordMessageBuilder().from(updateGameResponse, this).buildDiscordMessage(message);
      return message.embed(toBeSent);
    }

    toBeSent = new TargetGameDiscordMessageBuilder().from(updateGameResponse, this).buildDiscordMessage(message);
    return message.embed(toBeSent);
  }
}
