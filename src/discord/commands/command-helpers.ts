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

    // handle if the player name is wrapped in double-quotes, and presumably containing some whitespace
    const tempWhitespaceReplacement = "&nbsp;";
    const reg = /(["'])(?:(?=(\\?))\2.)*?\1/g;
    let match: RegExpExecArray;
    while ((match = reg.exec(argString)) !== null) {
      let modified = "";
      modified = `${match[0].replace(/\s/g, tempWhitespaceReplacement)}`;
      modified = modified.slice(1, modified.length - 1);
      argString = argString.substring(0, match.index) + modified + argString.substring(match.index + match[0].length);
    }

    // create an array of the items (including bars as items)
    // exclude any 0-length items (e.g. "")
    const dirty = argString.split(" ").filter(x => x.length);
    // replace the temp whitespace char with a real space char
    const cleaned = dirty.map(s => s.replace(RegExp(tempWhitespaceReplacement, "g"), " "));
    return cleaned;
  }

  private static getRandomDancer(i: number): string {
    const dancers = ["( •_•)>⌐■-■", "(⌐■_■)"];
    return dancers[i % dancers.length];
  }
}
