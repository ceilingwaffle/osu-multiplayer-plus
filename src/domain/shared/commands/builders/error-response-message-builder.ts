import { CommandResponseMessageBuilder } from "./command-response-message-builder";
import { CommandMessage } from "discord.js-commando";
import { Response } from "../../../../requests/Response";
import { RichEmbed } from "discord.js";
import { ValidationError } from "class-validator";

export class ErrorResponseMessageBuilder<ResponseDataType> extends CommandResponseMessageBuilder<ResponseDataType> {
  protected cardColor: number;
  protected iconImageUrl: string;
  protected thumbnailImageUrl: string;
  protected title: string;
  protected commandMessage: CommandMessage;
  protected responseReport: Response<ResponseDataType>;

  protected validationErrors: ValidationError[];
  protected otherErrors: string[];

  constructor(commandMessage: CommandMessage, controllerResponse: Response<ResponseDataType>) {
    // TODO: Figure out if this.commandMessage is undefined (i.e. if it has overridden the commandMessage property on the base class - but it should be defined after the super call?)
    super(commandMessage, controllerResponse);
    // TODO: throw error if no errors on the response
  }

  public getDiscordMessage(): RichEmbed {
    // TODO: use responseReport to get errors and build the message
    throw new Error("Method not implemented.");
  }
}
