import { AbstractDiscordMessageBuilder } from "./abstract.discord-message-builder";
import { CommandMessage, CommandoClient, Command } from "discord.js-commando";
import { Response } from "../../requests/Response";
import { RichEmbed } from "discord.js";
import { ValidationError } from "class-validator";

export class ErrorDiscordMessageBuilder extends AbstractDiscordMessageBuilder<any> {
  protected readonly color: number = 0xff0000; // red

  protected readonly authorIcon: string = "https://some_img_url/todo_error_iconImageUrl.png";

  protected readonly thumbnail: string = "https://some_img_url/todo_error_thumbnailImageUrl.png";

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

  public from(response: Response<any>, command: Command): this {
    super.from(response, command);
    this.validateErrorResponse(response);

    this.validationErrors = response.errors ? response.errors.validation : undefined;
    this.otherErrors = response.errors ? response.errors.messages : undefined;

    return this;
  }

  public buildDiscordMessage(commandMessage: CommandMessage): RichEmbed {
    const message = super.buildDiscordMessage(commandMessage);

    if (this.response.errors.validation) {
      message.addField(
        "Validation Errors",
        this.response.errors.validation
          .map(vError => `${vError.property}: "${vError.value}" is bad because: ${vError.constraints}`)
          .join("\n")
      );
    }
    if (this.response.errors.messages) {
      message.addField("Errors", this.response.errors.messages.join("\n"));
    }

    return message;
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
