import { RichEmbed } from "discord.js";
import { CommandMessage, Command } from "discord.js-commando";
import { AbstractDiscordMessageBuilder } from "../abstract.discord-message-builder";
import { Response } from "../../../requests/Response";
import { DiscordUserReportProperties } from "../../../domain/shared/reports/discord-user-report-properties";
import { DiscordCommandExampleBuilder } from "../../discord-command-example-builder";
import { AddTeamReport } from "../../../domain/team/reports/add-team.report";

export class AddTeamDiscordMessageBuilder extends AbstractDiscordMessageBuilder<AddTeamReport> {
  public from(response: Response<AddTeamReport>, command: Command): this {
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
    const removeTeamCommandExample = DiscordCommandExampleBuilder.getExampleFor({
      command: this.command,
      data: {
        teamId: this.response.result.teamId
      }
    });

    message.addField(
      "Team Properties",
      `Created team ID: ${this.response.result.teamId}
      Team Members: ${this.response.result.teamOsuUsernames.join(", ")} (remove team using: \`\`${removeTeamCommandExample}\`\`)
      Added to game ID: ${this.response.result.gameId}
      Added by: <@${teamCreator.discordUserId}> ${this.response.result.addedAgo}`
    );

    return message;
  }
}
