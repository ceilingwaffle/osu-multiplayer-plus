import { CommandoClient, SQLiteProvider } from "discord.js-commando";
import { CreateGameCommand } from "../domain/game/discord/create-game.command";
import { ConnectionManager } from "../utils/connection-manager";
import { Helpers } from "../utils/helpers";
import { Database } from "sqlite";
import { GameController } from "../domain/game/game.controller";
import { GameService } from "../domain/game/game.service";
import { UserService } from "../domain/user/user.service";
import * as entities from "../inversify.entities";
import iocContainer from "../inversify.config";
const sqlite = require("sqlite");

export class DiscordBot {
  private commando: CommandoClient;

  public async start(token: string): Promise<void> {
    // this.registerListeners();
    try {
      const connection = await ConnectionManager.getInstance();
      console.log(`Connected to database "${connection.options.database}".`);
    } catch (error) {
      console.error("Error connecting to database.", error);
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
      console.log("Initializing Discord Commando...");

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
        .registerCommand(new CreateGameCommand(this.commando));

      await sqlite.open(Helpers.getCommandoDatabasePath()).then((db: Database) => {
        this.commando.setProvider(new SQLiteProvider(db));
      });

      try {
        await this.commando.login(token);
        console.log("Discord login succeded.");
      } catch (error) {
        console.error("Discord bot token failed to login.", error);
      }

      this.commando.on("ready", () => {
        console.log("The discord bot is ready.");
      });
    } catch (error) {
      console.error("Error starting the Discord bot.", error);
      throw error;
    }
  }

  // private registerListeners(): void {
  //   this.gameManager.multiplayerService.on("obrMatchFinished", (matchResult: MatchResultInfo) => {
  //     console.log("TODO: Send discord message with new match result info...", matchResult);
  //   });
  // }
}
