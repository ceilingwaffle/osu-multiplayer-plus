import iocContainer from "../../../inversify.config";
import { CommandoClient, CommandMessage } from "discord.js-commando";
import { GameController } from "../../../domain/game/game.controller";
import { Message, RichEmbed, TextChannel } from "discord.js";
import { ErrorDiscordMessageBuilder } from "../../message-builders/error.discord-message-builder";
import { UpdateGameDiscordMessageBuilder } from "../../message-builders/game/update-game.discord-message-builder";
import * as entities from "../../../inversify.entities";
import { DiscordChannelManager } from "../../discord-channel-manager";
import { DiscordRequestDto } from "../../../requests/dto";
import { AppBaseCommand } from "../app-base-command";

export class CreateGameCommand extends AppBaseCommand {
  protected readonly gameController: GameController = iocContainer.get(entities.GameController);

  constructor(commando: CommandoClient) {
    super(commando, {
      name: "creategame",
      group: "osu",
      memberName: "creategame",
      description:
        "Creates a new osu! Battle Royale game. You can then add multiplayer lobbies to the game from which scores will be calculated.",
      aliases: [],
      examples: ["!obr creategame"], // new DiscordCommandExampleBuilder(this).getAll()
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
          key: "countFailed",
          prompt: "Should failed scores be counted in the team score calculations?",
          type: "string",
          default: "true"
        }
      ]
    });
  }

  public async run(
    message: CommandMessage,
    args: {
      lives: number;
      countFailed: "true" | "false";
    }
  ): Promise<Message | Message[]> {
    const requestDto: DiscordRequestDto = {
      commType: "discord",
      authorId: message.author.id,
      originChannelId: message.channel.id
    };

    const createGameResponse = await this.gameController.create({
      gameDto: {
        teamLives: args.lives,
        countFailedScores: args.countFailed === "true"
      },
      requestDto: requestDto
    });

    let toBeSent: RichEmbed;
    if (!createGameResponse || !createGameResponse.success) {
      // game was not created
      toBeSent = new ErrorDiscordMessageBuilder().from(createGameResponse, this).buildDiscordMessage(message);
      return message.embed(toBeSent);
    }

    // // game was created
    // // add a discord channel
    // const createTextChannelResponse = await DiscordChannelManager.createGameChannel(createGameResponse.result.gameId, message.guild);
    // if (!createTextChannelResponse || !createTextChannelResponse.success) {
    //   toBeSent = new ErrorDiscordMessageBuilder().from(createTextChannelResponse, this).buildDiscordMessage(message);
    //   return message.embed(toBeSent);
    // }

    // // TODO: Write test asserting that the game-message-target was added
    // const channel: TextChannel = createTextChannelResponse.result;
    // // update the game message target with the discord channel just created
    // const updateGameResponse = await this.gameController.update({
    //   gameDto: {
    //     gameId: createGameResponse.result.gameId,
    //     // Since it's a new game, this discord channel we're setting should be the *only* channel.
    //     // We're not adding a channel at this point, so use the "overwrite-all" action.
    //     gameMessageTargetAction: { action: "overwrite-all", commType: "discord", channelId: channel.id, channelType: "game-channel" }
    //   },
    //   requestDto: requestDto
    // });

    // if (!updateGameResponse || !updateGameResponse.success) {
    //   // game was not updated
    //   toBeSent = new ErrorDiscordMessageBuilder().from(updateGameResponse, this).buildDiscordMessage(message);
    //   return message.embed(toBeSent);
    // }

    toBeSent = new UpdateGameDiscordMessageBuilder().from(createGameResponse, this).buildDiscordMessage(message);
    return message.embed(toBeSent);
  }
}
