import { CreateGameReport } from "../../reports/create-game.report";
import { RichEmbed } from "discord.js";
import { CommandResponseMessageBuilder } from "../../../shared/commands/builders/command-response-message-builder";
import { Response } from "../../../../requests/Response";
import { CommandMessage } from "discord.js-commando";

// if we instantiate this class, we are saying there were no errors present in the response data received from the controller
export class CreateGameResponseBuilder extends CommandResponseMessageBuilder<CreateGameReport> {
  constructor(protected readonly commandMessage: CommandMessage, protected readonly controllerResponse: Response<CreateGameReport>) {
    super(commandMessage, controllerResponse);
    // throw error if responseReport contains errors
  }

  public getDiscordMessage(): RichEmbed {
    // could return one of: error message, validation errors, or success message.

    // TODO: The discord message title will be the success result message (e.g. create game success)
    throw new Error("Method not implemented.");
  }
}
