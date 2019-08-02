import { Command } from "discord.js-commando";

export interface DiscordCommandExample {
  command: Command;
  argument: string;
  exampleCommandText: string;
}
