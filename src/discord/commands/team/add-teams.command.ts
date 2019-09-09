import iocContainer from "../../../inversify.config";
import { CommandoClient, CommandMessage } from "discord.js-commando";
import { Message, RichEmbed } from "discord.js";
import { ErrorDiscordMessageBuilder } from "../../message-builders/error.discord-message-builder";
import * as entities from "../../../inversify.entities";
import { DiscordRequestDto } from "../../../requests/dto";
import { AppBaseCommand } from "../app-base-command";
import { TeamController } from "../../../domain/team/team.controller";
import { AddTeamDiscordMessageBuilder } from "../../message-builders/team/add-team.discord-message-builder";

export class AddTeamsCommand extends AppBaseCommand {
  protected readonly teamController: TeamController = iocContainer.get(entities.TeamController);

  constructor(commando: CommandoClient) {
    super(commando, {
      name: "addteams",
      group: "osu",
      memberName: "addteams",
      description: "Adds osu! users to teams for a game.",
      details: `Teams will be added to your most-recently created game. Use !targetgame <gameId> before using !addteam to specify a different game where the teams will be added to. \
        \nYou can either use the player's osu! username, or their osu! ID number. e.g. CeilingWaffle or 3336090 \
        \nIf the username contains spaces, make you sure you surround the username in double-quotes. e.g. "- Machine -" \
        \nIf the username contains double quotes, make you sure you escape (prefix) each of the double quote characters with a backslash. e.g. Mr\\\\\"DoubleQuotey\\\\\"Name \
        \nIf the username contains backslashes, make you sure you escape (prefix) each of the backslash characters with a backslash. e.g. Mr\\\\\\\\Backslashy\\\\\\\\Name \
        \nIf the username is made of numbers, add the user's osu user ID number instead of the username.`,
      aliases: ["addteam", "maketeam", "maketeams", "createteam", "createteams", "newteam", "newteams"],
      examples: [`!obr addteam "- Machine -" Mr\\\\\"DoubleQuotey\\\\\"Name | Mr\\\\\\\\Backslashy\\\\\\\\Name 3336090`],
      guildOnly: true, // accept commands from channels only, e.g. ignore DM commands
      argsPromptLimit: 0,
      args: [
        {
          key: "teams",
          prompt: `Enter the osu! usernames or osu ID numbers of the users to be added to a team. \
                    Add as many users as you want, each separated by a space. \
                    Add multiple teams at once by separating groups of usernames with a "|" character on a single line, or use ctrl+enter to place the teams on new lines.`,
          type: "string",
          infinite: true
        }
      ]
    });
  }

  public async run(
    message: CommandMessage,
    args: {
      teams: string[];
    }
  ): Promise<Message | Message[]> {
    const requestDto: DiscordRequestDto = {
      commType: "discord",
      authorId: message.author.id,
      originChannelId: message.channel.id
    };

    // user1 user2 | user3 user4

    const createTeamResponse = await this.teamController.create({
      teamDto: {
        osuUsernamesOrIdsOrSeparators: args.teams
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
