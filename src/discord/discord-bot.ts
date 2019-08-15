import { CommandoClient, SQLiteProvider } from "discord.js-commando";
import { CreateGameCommand } from "./commands/create-game.command";
import { ConnectionManager } from "../utils/connection-manager";
import { Helpers } from "../utils/helpers";
import { Database } from "sqlite";
import { GameController } from "../domain/game/game.controller";
import { GameService } from "../domain/game/game.service";
import { UserService } from "../domain/user/user.service";
import * as entities from "../inversify.entities";
import iocContainer from "../inversify.config";
import { EndGameCommand } from "./commands/end-game.command";
import { Log } from "../utils/Log";
import { AddLobbyCommand } from "./commands/add-lobby.command";
const sqlite = require("sqlite");

export class DiscordBot {
  private commando: CommandoClient;

  public async start(token: string): Promise<void> {
    // this.registerListeners();
    try {
      const connection = await ConnectionManager.getInstance();
      Log.debug(`Connected to database "${connection.options.database}".`);
    } catch (error) {
      Log.error("Error connecting to database.", error);
      throw error;
    }

    // console.log("Initializing Bancho...");
    // this.gameManager = new GameManager();
    // await this.gameManager
    //   .connect()
    //   .then(() => {
    //     console.log("Connected to Bancho.");
    //   })
    //   .catch(error => {
    //     console.error("Error connecting to Bancho.", error);
    //     return reject(error);
    //   });

    try {
      Log.debug("Initializing Discord Commando...");

      this.commando = new CommandoClient({
        owner: process.env.DISCORD_BOT_USER_ID,
        commandPrefix: "!obr ",
        messageCacheLifetime: 30,
        messageSweepInterval: 60,
        disableEveryone: true
      });

      this.commando.registry
        .registerDefaultTypes()
        .registerDefaultGroups()
        .registerDefaultCommands()
        .registerGroups([["osu", "osu! Battle Royale Commands"]])
        .registerCommand(new CreateGameCommand(this.commando))
        .registerCommand(new EndGameCommand(this.commando))
        .registerCommand(new AddLobbyCommand(this.commando));

      await sqlite.open(Helpers.getCommandoDatabasePath()).then((db: Database) => {
        this.commando.setProvider(new SQLiteProvider(db));
      });

      try {
        await this.commando.login(token);
        Log.debug("Discord login succeded.");
      } catch (error) {
        Log.error("Discord bot token failed to login.", error);
      }

      this.commando.on("ready", () => {
        Log.debug("The discord bot is ready.");
      });
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
