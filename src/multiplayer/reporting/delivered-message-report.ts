import { Message } from "discord.js";
import { ReportableMessage } from "./reportable-message";

export interface DeliveredMessageReport<M extends ReportableMessage> {
  originalMessage: M;
  delivered: boolean;
  error?: any;
}
