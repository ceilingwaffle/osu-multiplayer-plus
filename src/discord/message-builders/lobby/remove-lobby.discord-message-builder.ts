import { RichEmbed } from "discord.js";
import { CommandMessage, Command } from "discord.js-commando";
import { AbstractDiscordMessageBuilder } from "../abstract.discord-message-builder";
import { Response } from "../../../requests/Response";
import { DiscordUserReportProperties } from "../../../domain/shared/reports/discord-user-report-properties";
import { RemoveLobbyReport } from "../../../domain/lobby/reports/remove-lobby.report";

export class RemoveLobbyDiscordMessageBuilder extends AbstractDiscordMessageBuilder<RemoveLobbyReport> {
  public from(response: Response<RemoveLobbyReport>, command: Command): this {
    super.from(response, command);
    this.validateSuccessResponse(response);
    return this;
  }

  public buildDiscordMessage(commandMessage: CommandMessage): RichEmbed {
    const message = super.buildDiscordMessage(commandMessage);

    const remover = this.response.result.removedBy as DiscordUserReportProperties;

    message.addField(
      "Removed-Lobby Properties",
      `Multiplayer ID: ${this.response.result.multiplayerId}
      Game ID: ${this.response.result.gameIdRemovedFrom} (for info: \`\`!obr game ${this.response.result.gameIdRemovedFrom}\`\`)
      Lobby Status: ${this.response.result.status} 
      Removed by: <@${remover.discordUserId}> ${this.response.result.removedAgo}`
    );

    return message;
  }
}
