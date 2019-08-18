import iocContainer from "../../inversify.config";
import { Command, CommandoClient, CommandMessage } from "discord.js-commando";
import { LobbyController } from "../../inversify.entities";
import { Message, RichEmbed } from "discord.js";
import { ErrorDiscordMessageBuilder } from "../message-builders/error.discord-message-builder";
import { AddLobbyDiscordMessageBuilder } from "../message-builders/add-lobby.discord-message-builder";
import * as entities from "../../inversify.entities";

export class AddLobbyCommand extends Command {
  protected readonly lobbyController: LobbyController = iocContainer.get(entities.LobbyController);

  constructor(commando: CommandoClient) {
    super(commando, {
      name: "addlobby",
      group: "osu",
      memberName: "addlobby",
      description: "Adds an osu! multiplayer lobby to a game from which scores from match-results will be calculated.",
      examples: ["!obr addlobby 12345"],
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
            "Enter the game ID to add the lobby to. If this is not entered, the lobby will be added to the most-recent game you created.",
          type: "integer",
          default: -1
        },
        {
          key: "startAtMap",
          prompt:
            "Enter the map number to start calculating scores from. " +
            "This is useful if you want to ignore some warmup maps at the beginning of the lobby. " +
            "e.g. If you started with 2 warmup maps, enter 3.",
          type: "integer",
          default: 1
        }
      ]
    });
  }

  public async run(
    message: CommandMessage,
    args: {
      multiplayerId: string;
      gameId: number;
      startAtMap: number;
    }
  ): Promise<Message | Message[]> {
    const addLobbyResponse = await this.lobbyController.create({
      lobbyDto: {
        banchoMultiplayerId: args.multiplayerId,
        gameId: args.gameId,
        startAtMap: args.startAtMap
      },
      requestDto: {
        type: "discord",
        authorId: message.author.id,
        originChannel: message.channel.id
      }
    });

    let toBeSent: RichEmbed;
    if (!addLobbyResponse || !addLobbyResponse.success) {
      toBeSent = new ErrorDiscordMessageBuilder().from(addLobbyResponse, this).buildDiscordMessage(message);
    } else {
      toBeSent = new AddLobbyDiscordMessageBuilder().from(addLobbyResponse, this).buildDiscordMessage(message);
    }

    return message.embed(toBeSent);
  }
}