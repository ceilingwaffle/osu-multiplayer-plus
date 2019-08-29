import { Repository, EntityRepository, SelectQueryBuilder, DeleteResult } from "typeorm";
import { GameLobby } from "./game-lobby.entity";

@EntityRepository(GameLobby)
export class GameLobbyRepository extends Repository<GameLobby> {
  deleteGameLobby(gameLobby: GameLobby): Promise<DeleteResult> {
    if (!gameLobby.lobby || !gameLobby.lobby.id) {
      throw new Error("Lobby ID required");
    }
    if (!gameLobby.game || !gameLobby.game.id) {
      throw new Error("Game ID required");
    }
    return this.createQueryBuilder()
      .delete()
      .from(GameLobby)
      .where("lobby.id = :lobbyId", { lobbyId: gameLobby.lobby.id })
      .andWhere("game.id = :gameId", { gameId: gameLobby.game.id })
      .execute();
  }
}
