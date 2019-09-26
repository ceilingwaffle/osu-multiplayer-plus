import iocContainer from "../../../inversify.config";
import getDecorators from "inversify-inject-decorators";
import { TYPES } from "../../../types";
const { lazyInject } = getDecorators(iocContainer);
import { CommandoClient, CommandMessage } from "discord.js-commando";
import { GameController } from "../../../domain/game/game.controller";
import { AppBaseCommand } from "../app-base-command";
import { Message } from "discord.js";
import { DiscordRequestDto } from "../../../requests/dto";

export class StartGameCommand extends AppBaseCommand {
  @lazyInject(TYPES.GameController) private gameController: GameController;

  constructor(commando: CommandoClient) {
    super(commando, {
      name: "startgame",
      group: "osu",
      memberName: "startgame",
      description:
        "Use this comamnd once your game has been setup and is now ready to start scanning multiplayer lobbies for match results.",
      details:
        "You should first add players to teams and add lobbies to the game before starting the game (use !obr addteams and !obr addlobby). " +
        "Use !obr targetgame <gameId> to target a specific game, otherwise your most recently-created game will be targeted.",
      aliases: [],
      examples: [],
      guildOnly: true,
      argsPromptLimit: 0,
      args: []
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

    const startGameResponse = await this.gameController.startGame({ startGameDto: { gameId: args.gameID }, requestDto: requestDto });
  }
}
