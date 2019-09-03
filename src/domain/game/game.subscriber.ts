import { EventSubscriber, EntitySubscriberInterface, InsertEvent } from "typeorm";
import { Game } from "./game.entity";
import { UserGameRole } from "../role/user-game-role.entity";
import { Log } from "../../utils/Log";

@EventSubscriber()
export class GameSubscriber implements EntitySubscriberInterface<Game> {
  listenTo() {
    return Game;
  }

  async afterInsert(event: InsertEvent<Game>): Promise<void> {
    await this.setGameCreatorRole(event);
  }

  private async setGameCreatorRole(event: InsertEvent<Game>): Promise<void> {
    try {
      const game = event.entity;
      const userGameRole: UserGameRole = new UserGameRole();
      userGameRole.game = game;
      userGameRole.user = game.createdBy;
      userGameRole.role = "game-creator";
      await event.manager.getRepository(UserGameRole).save(userGameRole);
      Log.methodSuccess(this.setGameCreatorRole, this.constructor.name, { gameId: game.id, createdByUserId: game.createdBy.id });
    } catch (error) {
      Log.methodError(this.setGameCreatorRole, this.constructor.name, error);
      throw error;
    }
  }
}
