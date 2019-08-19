import { RichEmbed } from "discord.js";
import { CommandMessage, Command } from "discord.js-commando";
import { AbstractDiscordMessageBuilder } from "./abstract.discord-message-builder";
import { Response } from "../../requests/Response";
import { CreateGameReport } from "../../domain/game/reports/create-game.report";
import { DiscordUserReportProperties } from "../../domain/shared/reports/discord-user-report-properties";
import { DiscordCommandExampleBuilder } from "../discord-command-example-builder";

export class CreateGameDiscordMessageBuilder extends AbstractDiscordMessageBuilder<CreateGameReport> {
  public from(response: Response<CreateGameReport>, command: Command): this {
    super.from(response, command);
    this.validateSuccessResponse(response);

    DiscordCommandExampleBuilder.addExample({
      command: command,
      argument: "lives",
      exampleCommandText: "!obr game <gameId> edit lives <n>"
    });

    DiscordCommandExampleBuilder.addExample({
      command: command,
      argument: "countFailed",
      exampleCommandText: "!obr game <gameId> edit countFailed <n>"
    });

    return this;
  }

  public buildDiscordMessage(commandMessage: CommandMessage): RichEmbed {
    const message = super.buildDiscordMessage(commandMessage);

    const creator = this.response.result.createdBy as DiscordUserReportProperties;
    const refs = this.response.result.refereedBy as DiscordUserReportProperties[];

    const livesCommandExample = DiscordCommandExampleBuilder.getExampleFor(this.command, "lives", {
      gameId: this.response.result.gameId
    });
    const countFailedCommandExample = DiscordCommandExampleBuilder.getExampleFor(this.command, "countFailed", {
      gameId: this.response.result.gameId
    });

    message.addField(
      "Game Properties",
      `Game ID: ${this.response.result.gameId}
      Starting Lives: ${this.response.result.teamLives} (change using: \`\`${livesCommandExample}\`\`)
      Count Failed Scores: ${this.response.result.countFailedScores} (change using: \`\`${countFailedCommandExample}\`\`)
      Game Status: ${this.response.result.status}
      Referees: ${refs.map(ref => `<@${ref.discordUserId}>`).join(", ")}
      Created by: <@${creator.discordUserId}> ${this.response.result.createdAgo}`
    );

    return message;
  }
}
