import { RichEmbed } from "discord.js";
import { CommandMessage, Command } from "discord.js-commando";
import { AbstractDiscordMessageBuilder } from "../abstract.discord-message-builder";
import { Response } from "../../../requests/response";
import { DiscordUserReportProperties } from "../../../domain/shared/reports/discord-user-report-properties";
import { StartGameReport } from "../../../domain/game/reports/start-game.report";

export class StartGameDiscordMessageBuilder extends AbstractDiscordMessageBuilder<StartGameReport> {
  public from(response: Response<StartGameReport>, command: Command): this {
    super.from(response, command);
    this.validateSuccessResponse(response);

    return this;
  }

  public buildDiscordMessage(commandMessage: CommandMessage): RichEmbed {
    const message = super.buildDiscordMessage(commandMessage);

    const starter = this.response.result.startedBy as DiscordUserReportProperties;

    message.addField(
      "Game Properties",
      `Game ID: ${this.response.result.gameId}
      Started by: <@${starter.discordUserId}> ${this.response.result.startedAgo}`
    );
    // TODO: Include details about lobbies being scanned
    // TODO: Include message about "now ready to start playing the first map, etc"

    return message;
  }
}
