import { DiscordMessage } from "./discord-message";
import { Message } from "discord.js";

type ReportableMessage = DiscordMessage; // | WebMessage

export interface DeliveredMessageReport<M extends ReportableMessage> {
  originalMessage: M;
  delivered: boolean;
  discordMessageSent?: Message;
  error?: any;
}
