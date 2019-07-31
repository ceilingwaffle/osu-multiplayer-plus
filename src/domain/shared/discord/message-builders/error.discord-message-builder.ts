import { AbstractDiscordMessageBuilder } from "./abstract.discord-message-builder";
import { CommandMessage } from "discord.js-commando";
import { Response } from "../../../../requests/Response";
import { RichEmbed } from "discord.js";
import { ValidationError } from "class-validator";

export class ErrorDiscordMessageBuilder extends AbstractDiscordMessageBuilder<any> {
  protected readonly cardColor: number = 16711680; // red // TODO: Use library to get decimal value from RGB?

  protected readonly iconImageUrl: string = "https://some_img_url/todo_error_iconImageUrl.png";

  protected readonly thumbnailImageUrl: string = "https://some_img_url/todo_error_thumbnailImageUrl.png";

  /**
   * Validation errors on the response object.
   *
   * @protected
   * @type {ValidationError[]}
   */
  protected validationErrors: ValidationError[];

  /**
   * Any other (non-validation) errors on the response object.
   *
   * @protected
   * @type {string[]}
   */
  protected otherErrors: string[];

  public from(response: Response<any>): this {
    this.validateFailedResponse(response);

    this.title = response.message;
    this.validationErrors = response.errors ? response.errors.validation : undefined;
    this.otherErrors = response.errors ? response.errors.messages : undefined;

    return this;
  }

  public buildDiscordMessage(commandMessage: CommandMessage): RichEmbed {
    super.buildDiscordMessage(commandMessage);

    // TODO: use this.response to get validation/errors and build the message

    throw new Error("Method not implemented.");
  }

  /**
   * Returns a generic Discord message applicable to every type of Discord command that relies on no data whatsoever.
   * Should assume every response/command message property is potentially unsuable in some way (e.g. undefined).
   *
   * @static
   * @returns {RichEmbed}
   */
  public static buildUnknownErrorDiscordMessage(): RichEmbed {
    // TODO

    throw new Error("Method not implemented.");
  }
}
