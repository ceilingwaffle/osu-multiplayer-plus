import { RichEmbed } from "discord.js";
import { CommandMessage, Command } from "discord.js-commando";
import { AbstractDiscordMessageBuilder } from "./abstract.discord-message-builder";
import { Response } from "../../requests/Response";
import { DiscordUserReportProperties } from "../../domain/shared/reports/discord-user-report-properties";
import { AddLobbyReport } from "../../domain/lobby/reports/add-lobby.report";

export class AddLobbyDiscordMessageBuilder extends AbstractDiscordMessageBuilder<AddLobbyReport> {
  public from(response: Response<AddLobbyReport>, command: Command): this {
    super.from(response, command);
    this.validateSuccessResponse(response);
    return this;
  }

  public buildDiscordMessage(commandMessage: CommandMessage): RichEmbed {
    const message = super.buildDiscordMessage(commandMessage);

    const creator = this.responseResult.addedBy as DiscordUserReportProperties;

    message.addField(
      "Lobby Properties",
      `Multiplayer ID: ${this.responseResult.multiplayerId}
      Starting Map Number: ${this.responseResult.startAtMapNumber}
      Game ID: ${this.responseResult.gameId} (for info: \`\`!obr game ${this.responseResult.gameId}\`\`)
      Lobby Status: ${this.responseResult.status} 
      Added by: <@${creator.discordUserId}> ${this.responseResult.addedAgo}`
    );

    return message;
  }
}
