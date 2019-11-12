import { RichEmbed } from "discord.js";
import { ReportableContext } from "../../multiplayer/reports/reportable-context";
import { ReportableContextType } from "../../multiplayer/reports/reportable-context-type";

export class DiscordMessage {
  public message: RichEmbed;

  constructor(private reportable: ReportableContext<ReportableContextType>) {
    if (reportable.type === "game_event") {
      // TODO
    } else if (reportable.type === "message") {
      // TODO
    } else if (reportable.type === "leaderboard") {
      // TODO
    } else {
      const _exhaustiveCheck: never = reportable.type;
    }
  }
}
