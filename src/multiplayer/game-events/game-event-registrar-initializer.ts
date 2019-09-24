import iocContainer from "../../inversify.config";
import TYPES from "../../types";
import { GameEventRegistrarCollection } from "./game-event-registrar-collection";
import { GameRepository } from "../../domain/game/game.repository";
import { GameStatus } from "../../domain/game/game-status";
import { GameEvent } from "./game-event";
import { TeamWonMatchGameEvent } from "./events/team-won-match.game-event";
import { TeamEliminatedGameEvent } from "./events/team-eliminated.game-event";
import { Log } from "../../utils/Log";
import { Connection } from "typeorm";
import { IDbClient } from "../../database/db-client";

export class GameEventRegistrarInitializer {
  static async initGameEventRegistrarsFromActiveDatabaseGames(): Promise<void> {
    try {
      // We want GameEventRegistrarCollection as a singleton, so we'll use the iocContainer to ensure that.
      const gameEventRegistrarCollection = iocContainer.get<GameEventRegistrarCollection>(TYPES.GameEventRegistrarCollection);
      // get active games
      const dbClient = iocContainer.get<IDbClient>(TYPES.IDbClient);
      const dbConn: Connection = dbClient.getConnection();
      const gameRepository = dbConn.manager.getCustomRepository(GameRepository);
      const allGames = await gameRepository.find();
      const activeGames = allGames.filter(game => GameStatus.isActiveStatus(game.status));
      for (const game of activeGames) {
        // initialize game-event-registrars for all active games
        const registrar = gameEventRegistrarCollection.findOrCreate(game.id);
        // create unique (non-referenced) game-events for each registrar
        const gameEvents = GameEventRegistrarInitializer.createGameEvents();
        gameEventRegistrarCollection.registerGameEventsOnRegistrar(registrar, ...gameEvents);
      }
      Log.methodSuccess(this.initGameEventRegistrarsFromActiveDatabaseGames, GameEventRegistrarInitializer.name);
    } catch (error) {
      Log.methodError(this.initGameEventRegistrarsFromActiveDatabaseGames, GameEventRegistrarInitializer.name, error);
      throw error;
    }
  }

  static createGameEvents(): GameEvent[] {
    const events: GameEvent[] = [];
    // should be added in the order we want te events to displayed above the leaderboard
    events.push(new TeamWonMatchGameEvent());
    events.push(new TeamEliminatedGameEvent());
    return events;
  }
}
