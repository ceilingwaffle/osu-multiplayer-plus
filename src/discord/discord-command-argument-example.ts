import { Command } from "discord.js-commando";

export interface DiscordCommandArgumentExample {
  command: Command;
  argument: string;
  exampleCommandText: string;
}
