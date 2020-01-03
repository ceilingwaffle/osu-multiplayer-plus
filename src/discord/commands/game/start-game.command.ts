import iocContainer from "../../../inversify.config";
import { TYPES } from "../../../types";
import { CommandoClient, CommandMessage } from "discord.js-commando";
import { GameController } from "../../../domain/game/game.controller";
import { AppBaseCommand } from "../app-base-command";
import { Message, RichEmbed } from "discord.js";
import { DiscordRequestDto } from "../../../requests/dto";
import { Response } from "../../../requests/response";
import { StartGameReport } from "../../../domain/game/reports/start-game.report";
import { ErrorDiscordMessageBuilder } from "../../message-builders/error.discord-message-builder";
import { StartGameDiscordMessageBuilder } from "../../message-builders/game/start-game.discord-message-builder";

export class StartGameCommand extends AppBaseCommand {
  private gameController = iocContainer.get<GameController>(TYPES.GameController);

  constructor(commando: CommandoClient) {
    super(commando, {
      name: "startgame",
      group: "osu",
      memberName: "startgame",
      description:
        "Use this command once your game has been setup and is now ready to start scanning multiplayer lobbies for match results.",
      details:
        "You should first add players to teams and add lobbies to the game before starting the game (use !obr addteams and !obr addlobby). " +
        "Use !obr targetgame <gameId> to target a specific game, otherwise your most recently-created game will be targeted.",
      aliases: [],
      examples: [],
      guildOnly: true,
      argsPromptLimit: 0,
      args: [
        {
          key: "gameID",
          prompt: "The ID number of the game to be started.",
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
    const requestDto: DiscordRequestDto = {
      commType: "discord",
      authorId: message.author.id,
      originChannelId: message.channel.id
    };

    if (!(await this.confirm(message.message))) return;

    const startGameResponse: Response<StartGameReport> = await this.gameController.startGame({
      startGameDto: { gameId: args.gameID },
      requestDto: requestDto
    });

    let toBeSent: RichEmbed;
    if (!startGameResponse || !startGameResponse.success) {
      toBeSent = new ErrorDiscordMessageBuilder().from(startGameResponse, this).buildDiscordMessage(message);
    } else {
      toBeSent = new StartGameDiscordMessageBuilder().from(startGameResponse, this).buildDiscordMessage(message);
    }

    return message.embed(toBeSent);
  }
}
