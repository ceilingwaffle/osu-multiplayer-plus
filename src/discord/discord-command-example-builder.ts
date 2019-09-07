import { DiscordCommandExample } from "./discord-command-example";
import { Command } from "discord.js-commando";

export class DiscordCommandExampleBuilder {
  protected static readonly examples: DiscordCommandExample[] = [];

  static addExample(example: DiscordCommandExample): void {
    const key = this.getKey(example.command, example.argument);
    DiscordCommandExampleBuilder.examples[key] = example;
  }

  private static getKey(command: Command, argument?: string): string {
    let key: string;
    key = `${typeof command}`;
    if (argument) key += `:${argument}`;
    return key;
  }

  static getExampleFor({ command, data, arg }: { command: Command; data: Object; arg?: string }): string {
    // TODO: Unit test this method, asserting the string replacement
    const example: DiscordCommandExample = DiscordCommandExampleBuilder.examples[this.getKey(command, arg)];
    if (!example) {
      throw new Error(`No command examples have been added for command ${command.name}`);
    }

    let exampleCommandText: string = example.exampleCommandText;
    const keys = Object.keys(data);
    const values = Object.values(data);
    for (const i in keys) {
      const key = keys[i];
      // Replace <key> in example with data key value (e.g. "<gameId>" becomes "5" when data = {gameId: 5})
      exampleCommandText = exampleCommandText.replace(`<${key}>`, values[i]);
    }

    return exampleCommandText;
  }
}
