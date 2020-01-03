import { RichEmbed } from "discord.js";
import { CommandMessage, Command } from "discord.js-commando";
import { AbstractDiscordMessageBuilder } from "../abstract.discord-message-builder";
import { Response } from "../../../requests/response";
import { DiscordUserReportProperties } from "../../../domain/shared/reports/discord-user-report-properties";
import { DiscordCommandExampleBuilder } from "../../discord-command-example-builder";
import { AddTeamsReport } from "../../../domain/team/reports/add-teams.report";
import { Helpers } from "../../../utils/helpers";

export class AddTeamDiscordMessageBuilder extends AbstractDiscordMessageBuilder<AddTeamsReport> {
  public from(response: Response<AddTeamsReport>, command: Command): this {
    super.from(response, command);
    this.validateSuccessResponse(response);

    DiscordCommandExampleBuilder.addExample({
      command: command,
      exampleCommandText: "!obr removeteam <teamNumber>"
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
        data: { teamNumber: team.teamNumber }
      });

      message.addField(
        `Team #${team.teamNumber} (${team.teamColorName} team)`,
        `Team Members: ${team.teamOsuUsernames.join(", ")} 
        (remove team from game using: \`\`${removeTeamCommandExample}\`\`)`
      );
    }

    return message;
  }
}
