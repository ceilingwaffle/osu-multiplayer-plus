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
const sqlite = require("sqlite");

export class DiscordBot {
  private commando: CommandoClient;

  public async start(token: string): Promise<void> {
    // this.registerListeners();
    try {
      // const conn = await iocContainer.get<IDbClient>(TYPES.IDbClient).connectIfNotConnected();
      // Log.debug(`Connected to database "${conn.options.database}".`);
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
