import iocContainer from "../../../inversify.config";
import { TYPES } from "../../../types";
import { CommandoClient, CommandMessage } from "discord.js-commando";
import { Message, RichEmbed } from "discord.js";
import { ErrorDiscordMessageBuilder } from "../../message-builders/error.discord-message-builder";
import { DiscordRequestDto } from "../../../requests/dto";
import { AppBaseCommand } from "../app-base-command";
import { TeamController } from "../../../domain/team/team.controller";
import { AddTeamDiscordMessageBuilder } from "../../message-builders/team/add-team.discord-message-builder";
import { CommandHelpers } from "../command-helpers";

export class RemoveTeamCommand extends AppBaseCommand {
  private teamController = iocContainer.get<TeamController>(TYPES.TeamController);

  constructor(commando: CommandoClient) {
    super(commando, {
      name: "removeteam",
      group: "osu",
      memberName: "removeteam",
      description: "Removes a team from a game.",
      details: `Teams will be removed from your most-recently created game. Use !targetgame <gameId> before using !removeteam to specify a different game where the teams will be removed from.`,
      aliases: ["deleteteam", "delteam"],
      examples: [`!obr removeteam 1`],
      guildOnly: true, // accept commands from channels only, e.g. ignore DM commands
      argsPromptLimit: 0,
      args: [
        {
          key: "teams",
          prompt: `Enter the team number to remove.`,
          type: "integer",
          infinite: true
        }
      ]
    });
  }

  public async run(message: CommandMessage): Promise<Message | Message[]> {
    const { loadingTimer, loadingMessage } = await CommandHelpers.initLoadingMessage("Removing teams...", message);

    try {
      const requestDto: DiscordRequestDto = {
        commType: "discord",
        authorId: message.author.id,
        originChannelId: message.channel.id
      };

      const createTeamResponse = await this.teamController.remove({
        teamDto: {
          teamNumber: message.argString
        },
        requestDto: requestDto
      });

      throw new Error("TODO: Implement method of RemoveTeamCommand.");

      let toBeSent: RichEmbed;
      if (!createTeamResponse || !createTeamResponse.success) {
        // game was not created
        toBeSent = new ErrorDiscordMessageBuilder().from(createTeamResponse, this).buildDiscordMessage(message);
        return await message.embed(toBeSent);
      }

      toBeSent = new AddTeamDiscordMessageBuilder().from(createTeamResponse, this).buildDiscordMessage(message);
      return await message.embed(toBeSent);
    } catch (error) {
      throw error;
    } finally {
      await CommandHelpers.clearLoadingTimer(loadingTimer);
      loadingMessage instanceof Message ? loadingMessage.delete() : loadingMessage.forEach(m => m.delete());
    }
  }
}
