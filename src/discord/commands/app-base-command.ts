import { Command } from "discord.js-commando";
import { Message } from "discord.js";

export abstract class AppBaseCommand extends Command {
  /**
   *
   *
   * @protected
   * @param {Message} message
   * @returns {Promise<boolean>}
   */
  protected async confirm(message: Message, expireTimeMs: number = 10000): Promise<boolean> {
    let replyMessage = (await message.reply(
      `Are you sure? Reply with "yes" if so. Will expire in ${Math.floor(expireTimeMs / 1000)} seconds...`
    )) as Message;

    let filter = (msg: Message) => msg.author.id == message.author.id && msg.content.toLowerCase() == "yes";
    const collected = await message.channel.awaitMessages(filter, { max: 1, time: expireTimeMs });

    if (replyMessage && replyMessage.deletable) {
      replyMessage.delete();
    }
    if (collected && collected.first() && collected.first().deletable) {
      collected.first().delete();
    }

    if (collected.size < 1) {
      return false;
    } else {
      // message.reply("Confirmed!");
      return true;
    }
  }
}
