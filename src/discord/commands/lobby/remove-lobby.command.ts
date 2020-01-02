import iocContainer from "../../../inversify.config";
import { TYPES } from "../../../types";
import { CommandoClient, CommandMessage } from "discord.js-commando";
import { Message, RichEmbed } from "discord.js";
import { ErrorDiscordMessageBuilder } from "../../message-builders/error.discord-message-builder";
import { RemoveLobbyDiscordMessageBuilder } from "../../message-builders/lobby/remove-lobby.discord-message-builder";
import { AppBaseCommand } from "../app-base-command";
import { LobbyController } from "../../../domain/lobby/lobby.controller";

export class RemoveLobbyCommand extends AppBaseCommand {
  private lobbyController = iocContainer.get<LobbyController>(TYPES.LobbyController);

  constructor(commando: CommandoClient) {
    super(commando, {
      name: "removelobby",
      group: "osu",
      memberName: "removelobby",
      description:
        "Removes an osu! multiplayer lobby from a game. This will not close the actual lobby; " +
        "it will only tell the bot to stop scanning the lobby for match results.",
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
    if (!(await this.confirm(message.message))) return;

    const removeLobbyResponse = await this.lobbyController.remove({
      lobbyDto: {
        banchoMultiplayerId: args.multiplayerId,
        gameId: args.gameId
      },
      requestDto: {
        commType: "discord",
        authorId: message.author.id,
        originChannelId: message.channel.id
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
