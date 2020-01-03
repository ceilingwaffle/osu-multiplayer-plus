import iocContainer from "../../../inversify.config";
import TYPES from "../../../types";
import { GameEventRegistrarCollection } from "./game-event-registrar-collection";
import { GameRepository } from "../../../domain/game/game.repository";
import { GameStatus } from "../../../domain/game/game-status";
import { IGameEvent } from "../interfaces/game-event-interface";
import { TeamScoredHighestGameEvent } from "../team-scored-highest.game-event";
import { Log } from "../../../utils/log";
import { Connection } from "typeorm";
import { IDbClient } from "../../../database/db-client";
import { TeamScoredLowestGameEvent } from "../team-scored-lowest.game-event";
import { TeamScoresSubmittedGameEvent } from "../team-scores-submitted.game-event";
import { TeamScoresTiedGameEvent } from "../team-scores-tied.game-event";
import { TeamIsGameChampionGameEvent } from "../team-is-game-champion.game-event";
import { TeamEliminatedGameEvent } from "../team-eliminated.game-event";

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
      const activeGames = allGames.filter(game => GameStatus.isStartedStatus(game.status));
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

  static createGameEvents(): IGameEvent[] {
    const events: IGameEvent[] = [];
    // should be added in the order we want te events to displayed above the leaderboard
    events.push(new TeamScoresSubmittedGameEvent());
    events.push(new TeamScoredHighestGameEvent());
    events.push(new TeamScoresTiedGameEvent());
    events.push(new TeamScoredLowestGameEvent());
    events.push(new TeamEliminatedGameEvent());
    events.push(new TeamIsGameChampionGameEvent());
    return events;
  }
}
