import iocContainer from "../../inversify.config";
import { Command, CommandoClient, CommandMessage } from "discord.js-commando";
import { LobbyController } from "../../inversify.entities";
import { Message, RichEmbed } from "discord.js";
import { ErrorDiscordMessageBuilder } from "../message-builders/error.discord-message-builder";
import * as entities from "../../inversify.entities";
import { RemoveLobbyDiscordMessageBuilder } from "../message-builders/remove-lobby.discord-message-builder";

export class RemoveLobbyCommand extends Command {
  protected readonly lobbyController: LobbyController = iocContainer.get(entities.LobbyController);

  constructor(commando: CommandoClient) {
    super(commando, {
      name: "removelobby",
      group: "osu",
      memberName: "removelobby",
      description:
        "Removes an osu! multiplayer lobby from a game. This will not close the actual lobby; " +
        "it will only tell the bot to stop scanning the lobby for future results",
      examples: ["!obr removelobby 12345"],
      guildOnly: true,
      argsPromptLimit: 0,
      args: [
        {
          key: "multiplayerId",
          prompt: "Enter the multiplayer ID number (hint: it's the number like 12345 in https://osu.ppy.sh/community/matches/12345)",
          type: "string"
        },
        {
          key: "gameId",
          prompt:
            "Enter the game ID to remove the lobby from. If this is not entered, the lobby will be removed from the most-recent game you created.",
          type: "integer",
          default: -1
        }
      ]
    });
  }

  public async run(
    message: CommandMessage,
    args: {
      multiplayerId: string;
      gameId: number;
    }
  ): Promise<Message | Message[]> {
    const removeLobbyResponse = await this.lobbyController.remove({
      lobbyDto: {
        banchoMultiplayerId: args.multiplayerId,
        gameId: args.gameId
      },
      requestDto: {
        type: "discord",
        authorId: message.author.id,
        originChannel: message.channel.id
      }
    });

    let toBeSent: RichEmbed;
    if (!removeLobbyResponse || !removeLobbyResponse.success) {
      toBeSent = new ErrorDiscordMessageBuilder().from(removeLobbyResponse, this).buildDiscordMessage(message);
    } else {
      toBeSent = new RemoveLobbyDiscordMessageBuilder().from(removeLobbyResponse, this).buildDiscordMessage(message);
    }

    return message.embed(toBeSent);
  }
}
