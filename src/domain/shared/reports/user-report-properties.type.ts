import { DiscordUserReportProperties } from "./discord-user-report-properties";
import { WebUserReportProperties } from "./web-user-report-properties";

export type UserReportProperties = DiscordUserReportProperties | WebUserReportProperties;
