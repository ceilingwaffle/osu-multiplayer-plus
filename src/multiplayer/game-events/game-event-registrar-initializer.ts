import iocContainer from "../../inversify.config";
import TYPES from "../../types";
import { GameEventRegistrarCollection } from "./game-event-registrar-collection";
import { GameRepository } from "../../domain/game/game.repository";
import { GameStatus } from "../../domain/game/game-status";
import { GameEvent } from "./game-event";
import { TeamWonGameEvent } from "./events/team-won.game-event";
import { TeamEliminatedGameEvent } from "./events/team-eliminated.game-event";
import { Log } from "../../utils/Log";
import { getCustomRepository } from "typeorm";

export class GameEventRegistrarInitializer {
  static async initGameEventRegistrarsFromActiveDatabaseGames(): Promise<void> {
    try {
      // We want GameEventRegistrarCollection as a singleton, so we'll use the iocContainer to ensure that.
      const gameEventRegistrarCollection = iocContainer.get<GameEventRegistrarCollection>(TYPES.GameEventRegistrarCollection);
      // get active games
      const gameRepository = getCustomRepository(GameRepository);
      const allGames = await gameRepository.find();
      const activeGames = allGames.filter(game => GameStatus.isActiveStatus(game.status));
      // initialize game-event-registrars for all active games
      for (const game of activeGames) {
        const registrar = gameEventRegistrarCollection.findOrCreate(game.id);
        const gameEvents = GameEventRegistrarInitializer.createGameEvents();
        gameEventRegistrarCollection.registerGameEventsOnRegistrar(registrar, ...gameEvents);
      }
      Log.methodSuccess(this.initGameEventRegistrarsFromActiveDatabaseGames, this.constructor.name);
    } catch (error) {
      Log.methodError(this.initGameEventRegistrarsFromActiveDatabaseGames, this.constructor.name, error);
      throw error;
    }
  }

  private static createGameEvents(): GameEvent[] {
    const events: GameEvent[] = [];
    // should be added in the order we want te events to displayed above the leaderboard
    events.push(new TeamWonGameEvent());
    events.push(new TeamEliminatedGameEvent());
    return events;
  }
}
