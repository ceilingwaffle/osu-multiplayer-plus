import { RichEmbed } from "discord.js";
import { CommandMessage, Command } from "discord.js-commando";
import { AbstractDiscordMessageBuilder } from "./abstract.discord-message-builder";
import { Response } from "../../requests/Response";
import { DiscordUserReportProperties } from "../../domain/shared/reports/discord-user-report-properties";
import { DiscordCommandExampleBuilder } from "../discord-command-example-builder";
import { EndGameReport } from "../../domain/game/reports/end-game.report";

export class EndGameDiscordMessageBuilder extends AbstractDiscordMessageBuilder<EndGameReport> {
  public from(response: Response<EndGameReport>, command: Command): this {
    super.from(response, command);
    this.validateSuccessResponse(response);

    return this;
  }

  public buildDiscordMessage(commandMessage: CommandMessage): RichEmbed {
    const message = super.buildDiscordMessage(commandMessage);

    const ender = this.responseResult.endedBy as DiscordUserReportProperties;
    const a = this.responseResult.endedAt;

    message.addField(
      "Game Properties",
      `Game ID: ${this.responseResult.gameId}
      Starting Lives: ${this.responseResult.teamLives} (change using: \`\`${livesCommandExample}\`\`)
      Count Failed Scores: ${this.responseResult.countFailedScores} (change using: \`\`${countFailedCommandExample}\`\`)
      Game Status: ${this.responseResult.status}
      Referees: ${refs.map(ref => `<@${ref.discordUserId}>`).join(", ")}
      Ended by: <@${ender.discordUserId}> ${this.responseResult.createdAgo}
      Ended at: <@${creator.discordUserId}> ${this.responseResult.createdAgo}`
    );

    return message;
  }
}
