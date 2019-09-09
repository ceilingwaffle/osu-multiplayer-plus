import iocContainer from "../../../inversify.config";
import * as entities from "../../../inversify.entities";
import { Command, CommandoClient } from "discord.js-commando";
import { UserController } from "../../../domain/user/user.controller";

export class TargetGameCommand extends Command {
  protected readonly userController: UserController = iocContainer.get(entities.UserController);

  constructor(commando: CommandoClient) {
    super(commando, {
      name: "targetgame",
      group: "osu",
      memberName: "targetgame",
      description: "Sets a game ID as the target game of the user's future commands.",
      examples: ["!obr targetgame 1"],
      guildOnly: true,
      argsPromptLimit: 0,
      args: [
        {
          key: "gameId",
          prompt: "The ID number of the game to be targeted.",
          type: "integer"
        }
      ]
    });
  }
}
