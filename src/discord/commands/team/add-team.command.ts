import iocContainer from "../../../inversify.config";
import { CommandoClient, CommandMessage } from "discord.js-commando";
import { Message, RichEmbed } from "discord.js";
import { ErrorDiscordMessageBuilder } from "../../message-builders/error.discord-message-builder";
import * as entities from "../../../inversify.entities";
import { DiscordRequestDto } from "../../../requests/dto";
import { AppBaseCommand } from "../app-base-command";
import { TeamController } from "../../../domain/team/team.controller";
import { AddTeamDiscordMessageBuilder } from "../../message-builders/team/add-team.discord-message-builder";

export class AddTeamCommand extends AppBaseCommand {
  protected readonly teamController: TeamController = iocContainer.get(entities.TeamController);

  constructor(commando: CommandoClient) {
    super(commando, {
      name: "addteam",
      group: "osu",
      memberName: "addteam",
      description: "Adds osu! users to a team for a game.",
      details: `Teams will be added to your most-recently created game. Use !targetgame <gameId> before using !addteam to specify a different game where the teams will be added to. \
        \nYou can either use the player's osu! username, or their osu! ID number. \
        \nIf the username contains spaces, make you sure you surround the username in double-quotes. \
        \nIf the username contains double quotes, make you sure you escape (prefix) each of the double quote characters with a backslash. \
        \nIf the username contains backslashes, make you sure you escape (prefix) each of the backslash characters with a backslash. `,
      aliases: [],
      examples: [`!obr addteam "- Machine -" "Mr\"DoubleQuotey\"Name" "Mr\\Backslashy\\\\Name"`],
      guildOnly: true, // accept commands from channels only, e.g. ignore DM commands
      argsPromptLimit: 0,
      args: [
        {
          key: "osuUsernameOrId",
          prompt:
            "Enter the osu! username or osu ID number of the user to be added to the team. Add as many users as you want, each separated by a space.",
          type: "string",
          infinite: true
        }
      ]
    });
  }

  public async run(
    message: CommandMessage,
    args: {
      osuUsernameOrIds: string[];
    }
  ): Promise<Message | Message[]> {
    const requestDto: DiscordRequestDto = {
      commType: "discord",
      authorId: message.author.id,
      originChannelId: message.channel.id
    };

    const createTeamResponse = await this.teamController.create({
      teamDto: {
        osuUsernamesOrIds: args.osuUsernameOrIds
      },
      requestDto: requestDto
    });

    let toBeSent: RichEmbed;
    if (!createTeamResponse || !createTeamResponse.success) {
      // game was not created
      toBeSent = new ErrorDiscordMessageBuilder().from(createTeamResponse, this).buildDiscordMessage(message);
      return message.embed(toBeSent);
    }

    toBeSent = new AddTeamDiscordMessageBuilder().from(createTeamResponse, this).buildDiscordMessage(message);
    return message.embed(toBeSent);
  }
}
