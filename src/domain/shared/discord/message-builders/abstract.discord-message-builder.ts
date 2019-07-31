import { Response } from "../../../../requests/Response";
import { CommandMessage } from "discord.js-commando";
import { RichEmbed } from "discord.js";

/**
 * The Discord Message Builder to be extended. Should not be used if the Response contains errors. Instead, use the ErrorDiscordMessageBuilder.
 *
 * @export
 * @abstract
 * @class DiscordMessageBuilder
 * @template ResponseResultType
 */
export abstract class AbstractDiscordMessageBuilder<ResponseResultType> {
  /**
   * The RGB color value of the Discord message card (e.g. 16.7 million for 255,255,255 and 0 for 0,0,0)
   *
   * @protected
   * @abstract
   * @type {number}
   * @memberof ResponseMessageBuilder
   */
  protected readonly cardColor: number = 65280; // green

  /**
   * The bigger Discord Message card image (top right).
   *
   * @protected
   * @type {string}
   */
  protected readonly iconImageUrl: string = "https://some_img_url/todo_success_iconImageUrl.png";

  /**
   * The smaller Discord Message card icon (top left).
   *
   * @protected
   * @type {string}
   */
  protected readonly thumbnailImageUrl: string = "https://some_img_url/todo_success_thumbnailImageUrl.png";

  /**
   * The title to be displayed at the top of the Discord message.
   *
   * @protected
   * @type {string}
   */
  protected title: string = "😕";

  /**
   * The Response object of a certain data type.
   *
   * @protected
   * @type {Response<ResponseResultType>}
   */
  protected response: Response<ResponseResultType>;

  /**
   * The Response result data.
   *
   * @protected
   * @type {ResponseResultType}
   */
  protected responseResult: ResponseResultType;

  /**
   * Used to ensure the setup has been completed before building the message.
   *
   * @private
   * @type {boolean}
   */
  private isInitialized: boolean = false;

  /**
   * Does all the initializing and setup required before we can build the Discord message.
   *
   * @param {Response<ResponseResultType>} response
   * @returns {this}
   */
  public from(response: Response<ResponseResultType>): this {
    this.validateResponse(response);

    this.response = response;
    this.responseResult = response.result;
    this.title = response.message;

    this.isInitialized = true;

    return this;
  }

  /**
   * Builds a Discord RichEmbed Message from the Discord command arguments and the response result data.
   *
   * @param {CommandMessage} commandMessage
   * @returns {RichEmbed}
   */
  public buildDiscordMessage(commandMessage: CommandMessage): RichEmbed {
    if (!this.isInitialized) {
      throw new Error(`Must call ${this.from.name}() before ${this.buildDiscordMessage.name}().`);
    }
    return null;
  }

  protected validateResponse(response: Response<ResponseResultType>) {
    if (!response) throw new Error(`Response should be defined.`);
  }

  protected validateSuccessResponse(response: Response<ResponseResultType>) {
    this.validateResponse(response);
    if (response.success === false) throw new Error(`Response should have succeeded.`);
  }

  protected validateFailedResponse(response: Response<ResponseResultType>) {
    this.validateResponse(response);
    if (response.success === true) throw new Error(`Response should have failed.`);
  }
}
