import { CommandMessage } from "discord.js-commando";
import { Response } from "../../../../requests/Response";
import { RichEmbed } from "discord.js";
import { ErrorResponseMessageBuilder } from "./error-response-message-builder";

/**
 * The Command Response Message Builder.
 *
 * @export
 * @abstract
 * @class CommandResponseMessageBuilder
 * @template ResponseDataType The type of the Response data.
 */
export abstract class CommandResponseMessageBuilder<ResponseDataType> {
  /**
   * The RGB color value of the Discord message card (e.g. 16.7 million for 255,255,255 and 0 for 0,0,0)
   *
   * @protected
   * @abstract
   * @type {number}
   * @memberof CommandResponseMessageBuilder
   */
  protected readonly cardColor: number;
  protected readonly iconImageUrl: string;
  protected readonly thumbnailImageUrl: string;

  public readonly instance: this;

  constructor(protected readonly commandMessage: CommandMessage, protected readonly controllerResponse: Response<ResponseDataType>) {
    if (this instanceof ErrorResponseMessageBuilder) {
      // TODO: When instanciating ErrorsResponseMessageBuilder, find out if "this" refers to ErrorsResponseMessageBuilder, or CommandResponseMessageBuilder
    }
  }

  public abstract getDiscordMessage(): RichEmbed;

  public getGeneralErrorMessage(): RichEmbed {
    // Assume every property is invalid or bad in some way.
    // Return a generic message applicable to every type of Discord command that relies on no data whatsoever.
    throw new Error("Method not implemented.");
  }
}
