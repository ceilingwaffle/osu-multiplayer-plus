import { Response } from "../../requests/Response";
import { CommandMessage, CommandoClient, Command } from "discord.js-commando";
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
  protected readonly color: number = 0x00ff00; // green

  /**
   * The smaller Discord Message card icon image (top left).
   *
   * @protected
   * @type {string}
   */
  protected readonly authorIcon: string = "https://i.imgur.com/lm8s41J.png";

  /**
   * The bigger Discord Message card image (top right).
   *
   * @protected
   * @type {string}
   */
  protected readonly thumbnail: string = "http://i.imgur.com/p2qNFag.png";

  /**
   * The title to be displayed at the top of the Discord message.
   *
   * @protected
   * @type {string}
   */
  protected title: string = "😕";

  protected command: Command;

  /**
   * The Response object of a certain data type.
   *
   * @protected
   * @type {Response<ResponseResultType>}
   */
  protected response: Response<ResponseResultType>;

  /**
   * Used to ensure the setup has been completed before building the message.
   *
   * @private
   * @type {boolean}
   */
  private isReadyForBuilding: boolean = false;

  /**
   * Does all the initializing and setup required before we can build the Discord message.
   *
   * @param {Response<ResponseResultType>} response
   * @returns {this}
   */
  public from(response: Response<ResponseResultType>, command: Command): this {
    this.validateResponse(response);

    this.command = command;
    this.response = response;
    this.title = response.message;

    this.isReadyForBuilding = true;

    return this;
  }

  /**
   * Builds a Discord RichEmbed Message from the Discord command arguments and the response result data.
   *
   * @param {CommandMessage} commandMessage
   * @returns {RichEmbed}
   */
  public buildDiscordMessage(commandMessage: CommandMessage): RichEmbed {
    if (!this.isReadyForBuilding) {
      throw new Error(`Must call ${this.from.name}() before ${this.buildDiscordMessage.name}().`);
    }
    const message = new RichEmbed();
    message.setColor(this.color);
    message.setAuthor(this.title, this.authorIcon);
    return message;
  }

  protected validateResponse(response: Response<ResponseResultType>) {
    if (!response) throw new Error(`Response should be defined.`);
  }

  protected validateSuccessResponse(response: Response<ResponseResultType>) {
    this.validateResponse(response);
    if (response.success === false) throw new Error(`Response should have succeeded.`);
  }

  protected validateErrorResponse(response: Response<ResponseResultType>) {
    this.validateResponse(response);
    if (response.success === true) throw new Error(`Response should have failed.`);
  }

  protected linkChannel(channelId: string): string {
    return "<#" + channelId + ">";
  }
}
