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
import { resolve } from "path";
const sqlite = require("sqlite");

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

      await sqlite.open(Helpers.getCommandoDatabasePath()).then((db: Database) => {
        this.commando.setProvider(new SQLiteProvider(db));
      });

      await this.commando.login(token);
      Log.debug("Discord login succeded.");
    } catch (error) {
      Log.error("Error starting the Discord bot.", error);
      throw error;
    }
  }

  // private registerListeners(): void {
  //   this.gameManager.multiplayerService.on("obrMatchFinished", (matchResult: MatchResultInfo) => {
  //     Log.debug("TODO: Send discord message with new match result info...", matchResult);
  //   });
  // }
}
