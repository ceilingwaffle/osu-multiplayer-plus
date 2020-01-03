import { RichEmbed } from "discord.js";
import { CommandMessage, Command } from "discord.js-commando";
import { AbstractDiscordMessageBuilder } from "../abstract.discord-message-builder";
import { Response } from "../../../requests/response";
import { DiscordUserReportProperties } from "../../../domain/shared/reports/discord-user-report-properties";
import { EndGameReport } from "../../../domain/game/reports/end-game.report";

export class EndGameDiscordMessageBuilder extends AbstractDiscordMessageBuilder<EndGameReport> {
  public from(response: Response<EndGameReport>, command: Command): this {
    super.from(response, command);
    this.validateSuccessResponse(response);

    return this;
  }

  public buildDiscordMessage(commandMessage: CommandMessage): RichEmbed {
    const message = super.buildDiscordMessage(commandMessage);

    const ender = this.response.result.endedBy as DiscordUserReportProperties;

    message.addField(
      "Game Properties",
      `Game ID: ${this.response.result.gameId}
      Ended by: <@${ender.discordUserId}> ${this.response.result.endedAgo}`
    );

    return message;
  }
}
