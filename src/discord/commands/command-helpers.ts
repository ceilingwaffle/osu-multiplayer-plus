import { CommandMessage } from "discord.js-commando";
import { dynamic, clearIntervalAsync, SetIntervalAsyncTimer } from "set-interval-async";
import { Message } from "discord.js";

export class CommandHelpers {
  static clearLoadingTimer(loadingTimer: SetIntervalAsyncTimer): Promise<void> {
    return clearIntervalAsync(loadingTimer);
  }

  static async initLoadingMessage(sayText: string, commandMessage: CommandMessage, interval: number = 2000) {
    let a = 0;
    const loadingMessage = await commandMessage.say(sayText);
    const loadingTimer = dynamic.setIntervalAsync(async () => {
      await (loadingMessage as Message).edit(sayText + " " + this.getRandomDancer(a++));
    }, interval);
    return { loadingTimer, loadingMessage };
  }

  /**
   * Transforms
   * e.g. "\nuser1 user2\nuser3  user4" -> ["user1", "user2", "|", "user3", "user4"]
   *
   * @private
   * @param {string} argString
   * @param {string} separator
   * @returns {string[]}
   */
  static createArgsArrayWithSeparators(argString: string, separator: string): string[] {
    if (argString.includes("\n")) {
      // remove any leading newline characters
      argString = argString.replace(/^((?:\n)*)/, "");
      // replace remaining newline characters with the separator surrounded by spaces
      argString = argString.replace("\n", ` ${separator} `);
    }
    // create an array of the items (including bars as items)
    // exclude any 0-length items (e.g. "")
    return argString.split(" ").filter(x => x.length);
  }

  private static getRandomDancer(i: number): string {
    const dancers = ["( •_•)>⌐■-■", "(⌐■_■)"];
    return dancers[i % dancers.length];
  }
}
