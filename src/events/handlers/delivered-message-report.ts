import { DiscordMessage } from "./discord-message";

type ReportableMessage = DiscordMessage; // | WebMessage

export interface DeliveredMessageReport<M extends ReportableMessage> {
  message: M;
  delivered: boolean;
  error?: any;
}
