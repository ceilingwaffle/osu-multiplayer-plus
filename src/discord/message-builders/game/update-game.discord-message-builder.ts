import { RichEmbed } from "discord.js";
import { CommandMessage, Command } from "discord.js-commando";
import { AbstractDiscordMessageBuilder } from "../abstract.discord-message-builder";
import { Response } from "../../../requests/response";
import { UpdateGameReport } from "../../../domain/game/reports/update-game.report";
import { DiscordUserReportProperties } from "../../../domain/shared/reports/discord-user-report-properties";
import { DiscordCommandExampleBuilder } from "../../discord-command-example-builder";

export class UpdateGameDiscordMessageBuilder extends AbstractDiscordMessageBuilder<UpdateGameReport> {
  public from(response: Response<UpdateGameReport>, command: Command): this {
    super.from(response, command);
    this.validateSuccessResponse(response);

    DiscordCommandExampleBuilder.addExample({
      command: command,
      argument: "lives",
      exampleCommandText: "!obr editgame lives <n>"
    });

    DiscordCommandExampleBuilder.addExample({
      command: command,
      argument: "countfailed",
      exampleCommandText: "!obr editgame countfailed <true/false>"
    });

    return this;
  }

  public buildDiscordMessage(commandMessage: CommandMessage): RichEmbed {
    const message = super.buildDiscordMessage(commandMessage);

    const creator = this.response.result.createdBy as DiscordUserReportProperties;
    const refs = this.response.result.refereedBy as DiscordUserReportProperties[];

    const livesCommandExample = DiscordCommandExampleBuilder.getExampleFor({
      command: this.command,
      arg: "lives",
      data: {
        gameId: this.response.result.gameId
      }
    });
    const countFailedCommandExample = DiscordCommandExampleBuilder.getExampleFor({
      command: this.command,
      arg: "countfailed",
      data: {
        gameId: this.response.result.gameId
      }
    });

    // TODO: Write test asserting only one game-channel defined for all message targets for this game
    const gameChannel = this.response.result.messageTargets.find(mt => mt.channelType === "game-channel");
    const initialChannel = this.response.result.messageTargets.find(mt => mt.channelType === "initial-channel");
    message.addField(
      "Game Properties",
      `Channel: ${gameChannel ? this.linkChannel(gameChannel.channelId) : this.linkChannel(initialChannel.channelId)}
      Game ID: ${this.response.result.gameId}
      Starting Lives: ${this.response.result.teamLives} (change using: \`\`${livesCommandExample}\`\`)
      Count Failed Scores: ${this.response.result.countFailedScores} (change using: \`\`${countFailedCommandExample}\`\`)
      Game Status: ${this.response.result.status}
      Referees: ${refs.map(ref => `<@${ref.discordUserId}>`).join(", ")}
      Created by: <@${creator.discordUserId}> ${this.response.result.createdAgo}`
    );

    return message;
  }
}
