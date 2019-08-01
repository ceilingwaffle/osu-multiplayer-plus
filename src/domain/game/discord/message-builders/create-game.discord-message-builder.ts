import { RichEmbed } from "discord.js";
import { CommandMessage } from "discord.js-commando";
import { AbstractDiscordMessageBuilder } from "../../../../discord/message-builders/abstract.discord-message-builder";
import { Response } from "../../../../requests/Response";
import { CreateGameReport } from "../../reports/create-game.report";

export class CreateGameDiscordMessageBuilder extends AbstractDiscordMessageBuilder<CreateGameReport> {
  public from(response: Response<CreateGameReport>): this {
    super.from(response);
    this.validateSuccessResponse(response);
    return this;
  }

  public buildDiscordMessage(commandMessage: CommandMessage): RichEmbed {
    const message = super.buildDiscordMessage(commandMessage);

    message.addField(
      "Game Properties",
      `
      Starting Lives: ${this.responseResult.teamLives}\n
      Count Failed Scores: ${this.responseResult.countFailedScores}\n
      Game Status: ${this.responseResult.status}\n
      Created by: ${this.responseResult.createdBy}\n
    `
    );

    return message;
  }
}
