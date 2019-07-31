import { RichEmbed } from "discord.js";
import { CommandMessage } from "discord.js-commando";
import { AbstractDiscordMessageBuilder } from "../../../shared/discord/message-builders/abstract.discord-message-builder";
import { Response } from "../../../../requests/Response";
import { CreateGameReport } from "../../reports/create-game.report";

export class CreateGameDiscordMessageBuilder extends AbstractDiscordMessageBuilder<CreateGameReport> {
  public from(response: Response<CreateGameReport>): this {
    super.from(response);
    this.validateSuccessResponse(response);

    // TODO

    throw new Error("Method not implemented.");
  }

  public buildDiscordMessage(commandMessage: CommandMessage): RichEmbed {
    super.buildDiscordMessage(commandMessage);

    // TODO

    throw new Error("Method not implemented.");
  }
}
