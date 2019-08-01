import { RichEmbed } from "discord.js";
import { CommandMessage } from "discord.js-commando";
import { AbstractDiscordMessageBuilder } from "../../../../discord/message-builders/abstract.discord-message-builder";
import { Response } from "../../../../requests/Response";
import { CreateGameReport } from "../../reports/create-game.report";
import { DiscordUserReportProperties } from "../../../shared/reports/discord-user-report-properties";

export class CreateGameDiscordMessageBuilder extends AbstractDiscordMessageBuilder<CreateGameReport> {
  public from(response: Response<CreateGameReport>): this {
    super.from(response);
    this.validateSuccessResponse(response);
    return this;
  }

  public buildDiscordMessage(commandMessage: CommandMessage): RichEmbed {
    const message = super.buildDiscordMessage(commandMessage);

    const creator = this.responseResult.createdBy as DiscordUserReportProperties;
    const refs = this.responseResult.refereedBy as DiscordUserReportProperties[];

    message.addField(
      "Game Properties",
      `Starting Lives: ${this.responseResult.teamLives}
      Count Failed Scores: ${this.responseResult.countFailedScores}
      Game Status: ${this.responseResult.status}
      Referees: ${refs.map(ref => `<@${ref.discordUserId}>`).join(", ")}
      Created by: <@${creator.discordUserId}>`
    );

    return message;
  }
}
