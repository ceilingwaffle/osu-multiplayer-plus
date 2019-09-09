import { RichEmbed } from "discord.js";
import { CommandMessage, Command } from "discord.js-commando";
import { AbstractDiscordMessageBuilder } from "../abstract.discord-message-builder";
import { Response } from "../../../requests/Response";
import { DiscordUserReportProperties } from "../../../domain/shared/reports/discord-user-report-properties";
import { UpdateUserReport } from "../../../domain/user/reports/update-user.report";

export class TargetGameDiscordMessageBuilder extends AbstractDiscordMessageBuilder<UpdateUserReport> {
  public from(response: Response<UpdateUserReport>, command: Command): this {
    super.from(response, command);
    this.validateSuccessResponse(response);
    return this;
  }

  public buildDiscordMessage(commandMessage: CommandMessage): RichEmbed {
    const message = super.buildDiscordMessage(commandMessage);
    const userUpdater = this.response.result.updatedBy as DiscordUserReportProperties;

    message.addField(
      this.response.message,
      `<@${userUpdater.discordUserId}> now targetting game ID ${this.response.result.targettingGameId}`
    );

    return message;
  }
}
