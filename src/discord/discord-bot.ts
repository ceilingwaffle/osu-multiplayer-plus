import { CommandoClient, SQLiteProvider } from "discord.js-commando";
import { CreateGameCommand } from "./commands/game/create-game.command";
import { Helpers } from "../utils/helpers";
import { Database } from "sqlite";
import { EndGameCommand } from "./commands/game/end-game.command";
import { Log } from "../utils/Log";
import { AddLobbyCommand } from "./commands/lobby/add-lobby.command";
import { RemoveLobbyCommand } from "./commands/lobby/remove-lobby.command";
import { EditGameCommand } from "./commands/game/edit-game.command";
import { AddTeamsCommand } from "./commands/team/add-teams.command";
import { TargetGameCommand } from "./commands/game/target-game.command";
import { StartGameCommand } from "./commands/game/start-game.command";
import { DiscordMessage } from "../events/handlers/discord-message";
import { DeliveredMessageReport } from "../events/handlers/delivered-message-report";
import { TextChannel, RichEmbed, Message } from "discord.js";
import { injectable } from "inversify";
const sqlite = require("sqlite");

@injectable()
export class DiscordBot {
  private commando: CommandoClient;

  public async start(token: string): Promise<void> {
    try {
      Log.debug("Initializing Discord Commando...");

      this.commando = new CommandoClient({
        owner: process.env.DISCORD_BOT_USER_ID,
        commandPrefix: "!obr ",
        messageCacheLifetime: 30,
        messageSweepInterval: 60,
        disableEveryone: true
      });

      this.commando.on("ready", async () => {
        Log.debug("The discord bot is ready.");
        await this.commando.user.setPresence({
          status: "online",
          afk: false,
          game: {
            name: "osumpp.xyz | !obr help | Made by @Ceiling Waffle#7981",
            url: "https://osumpp.xyz",
            type: "PLAYING"
          }
        });
      });

      this.commando.on("error", error => {
        // TODO: Send error to any Discord channels in Game.GameMessageTargets if that game is currently active
        Log.error("Discord bot error:", error);
      });
      this.commando.on("warn", message => {
        Log.warn("Discord bot warning:", message);
      });
      this.commando.on("debug", message => {
        if (message.includes(process.env.DISCORD_BOT_TOKEN)) {
          return Log.warn("Discord bot debug:", "<DISCORD_BOT_TOKEN message removed from log>");
        }
        Log.info("Discord bot debug:", message);
      });

      this.commando.registry
        .registerDefaultTypes()
        .registerDefaultGroups()
        .registerDefaultCommands()
        .registerGroups([["osu", "osu! Battle Royale Commands"]])
        .registerCommand(new CreateGameCommand(this.commando))
        .registerCommand(new EditGameCommand(this.commando))
        .registerCommand(new EndGameCommand(this.commando))
        .registerCommand(new StartGameCommand(this.commando))
        .registerCommand(new AddLobbyCommand(this.commando))
        .registerCommand(new RemoveLobbyCommand(this.commando))
        .registerCommand(new AddTeamsCommand(this.commando))
        .registerCommand(new TargetGameCommand(this.commando));

      await sqlite.open(Helpers.getOrCreateCommandoDatabasePath()).then((db: Database) => {
        this.commando.setProvider(new SQLiteProvider(db));
      });

      await this.commando.login(token);
      Log.debug("Discord login succeded.");
    } catch (error) {
      Log.error("Error starting the Discord bot.", error);
      throw error;
    }
  }

  async sendChannelMessage(message: DiscordMessage, channelId: string): Promise<DeliveredMessageReport<DiscordMessage>> {
    return new Promise<DeliveredMessageReport<DiscordMessage>>(async (resolve, reject) => {
      const richEmbeds: RichEmbed[] = message.getRichEmbeds();
      const channel = this.commando.channels.find(c => c.id === channelId) as TextChannel;
      if (!channel) return reject(`Discord channel ${channelId} unknown to Discord client.`);
      try {
        const delivered: Message[] = [];
        for (const richEmbed of richEmbeds) {
          const delivery: Message = await channel.sendEmbed(richEmbed);
          Log.methodSuccess(this.sendChannelMessage, this.constructor.name, `Sent Discord message to channel ID ${channelId}`, {
            reportablesSent: message.getReportables()
          });
          delivered.push(delivery);
        }
        return resolve({
          originalMessage: message,
          discordMessagesSent: delivered,
          delivered: true
        });
      } catch (error) {
        Log.methodFailure(
          this.sendChannelMessage,
          this.constructor.name,
          `Discord message failed to send to text channel ID ${channelId}.`,
          error
        );
        return reject(error);
      }
    });
  }

  // private registerListeners(): void {
  //   this.gameManager.multiplayerService.on("obrMatchFinished", (matchResult: MatchResultInfo) => {
  //     Log.debug("TODO: Send discord message with new match result info...", matchResult);
  //   });
  // }
}
