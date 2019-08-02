import { DiscordCommandExample } from "./discord-command-example";
import { Command } from "discord.js-commando";

export class DiscordCommandExampleBuilder {
  protected static readonly examples: DiscordCommandExample[] = [];

  static addExample(example: DiscordCommandExample): void {
    DiscordCommandExampleBuilder.examples[`${typeof example.command}:${example.argument}`] = example;
  }

  static getExampleFor(command: Command, arg: string, data: Object): string {
    // TODO: Unit test this method, asserting the string replacement
    const example: DiscordCommandExample = DiscordCommandExampleBuilder.examples[`${typeof command}:${arg}`];
    if (!example) {
      throw new Error(`No command examples have been added for command ${command.name}`);
    }

    let exampleCommandText: string = example.exampleCommandText;
    const keys = Object.keys(data);
    const values = Object.values(data);
    // replace <key> in example with data key value (e.g. "<gameId>" becomes "5" when data = {gameId: 5})
    for (const i in keys) {
      const key = keys[i];
      exampleCommandText = exampleCommandText.replace(`<${key}>`, values[i]);
    }

    return exampleCommandText;
  }
}
