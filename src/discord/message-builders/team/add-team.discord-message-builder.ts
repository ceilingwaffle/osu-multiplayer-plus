import { RichEmbed } from "discord.js";
import { CommandMessage, Command } from "discord.js-commando";
import { AbstractDiscordMessageBuilder } from "../abstract.discord-message-builder";
import { Response } from "../../../requests/Response";
import { DiscordUserReportProperties } from "../../../domain/shared/reports/discord-user-report-properties";
import { DiscordCommandExampleBuilder } from "../../discord-command-example-builder";
import { AddTeamsReport } from "../../../domain/team/reports/add-teams.report";

export class AddTeamDiscordMessageBuilder extends AbstractDiscordMessageBuilder<AddTeamsReport> {
  public from(response: Response<AddTeamsReport>, command: Command): this {
    super.from(response, command);
    this.validateSuccessResponse(response);

    DiscordCommandExampleBuilder.addExample({
      command: command,
      exampleCommandText: "!obr removeteam <teamId>"
    });

    return this;
  }

  public buildDiscordMessage(commandMessage: CommandMessage): RichEmbed {
    const message = super.buildDiscordMessage(commandMessage);
    const teamCreator = this.response.result.addedBy as DiscordUserReportProperties;

    message.addField(
      this.response.message,
      `Added to game ID: ${this.response.result.addedToGameId}
      Added by: <@${teamCreator.discordUserId}> ${this.response.result.addedAgo}`
    );

    for (const team of this.response.result.teams) {
      const removeTeamCommandExample = DiscordCommandExampleBuilder.getExampleFor({
        command: this.command,
        data: { teamId: team.teamId }
      });

      message.addField(
        `Team ID: ${team.teamId}`,
        `Team Members: ${team.teamOsuUsernames.join(", ")} 
        (remove team using: \`\`${removeTeamCommandExample}\`\`)`
      );
    }

    return message;
  }
}
