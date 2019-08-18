import { RichEmbed } from "discord.js";
import { CommandMessage, Command } from "discord.js-commando";
import { AbstractDiscordMessageBuilder } from "./abstract.discord-message-builder";
import { Response } from "../../requests/Response";
import { DiscordUserReportProperties } from "../../domain/shared/reports/discord-user-report-properties";
import { RemoveLobbyReport } from "../../domain/lobby/reports/remove-lobby.report";

export class RemoveLobbyDiscordMessageBuilder extends AbstractDiscordMessageBuilder<RemoveLobbyReport> {
  public from(response: Response<RemoveLobbyReport>, command: Command): this {
    super.from(response, command);
    this.validateSuccessResponse(response);
    return this;
  }

  public buildDiscordMessage(commandMessage: CommandMessage): RichEmbed {
    const message = super.buildDiscordMessage(commandMessage);

    const remover = this.responseResult.removedBy as DiscordUserReportProperties;

    message.addField(
      "Removed-Lobby Properties",
      `Multiplayer ID: ${this.responseResult.multiplayerId}
      Game ID: ${this.responseResult.gameIdRemovedFrom} (for info: \`\`!obr game ${this.responseResult.gameIdRemovedFrom}\`\`)
      Lobby Status: ${this.responseResult.status} 
      Removed by: <@${remover.discordUserId}> ${this.responseResult.removedAgo}`
    );

    return message;
  }
}
