import { Repository, EntityRepository, Brackets, UpdateResult } from "typeorm";
import { Game } from "./game.entity";

@EntityRepository(Game)
export class GameRepository extends Repository<Game> {
  getMostRecentGameCreatedByUser(userId: number): Promise<Game> {
    return this.createQueryBuilder("games")
      .leftJoin("games.createdBy", "user")
      .where("user.id = :userId", { userId: userId })
      .orderBy("games.createdAt", "DESC")
      .getOne();
  }

  /**
   * Finds the game matching a game id, containing lobbies of one or more lobby statuses.
   *
   * @param {number} gameId
   * @param {string[]} lobbyStatuses
   * @returns {Promise<Game>}
   */
  findGameWithLobbiesHavingLobbyStatus(gameId: number, lobbyStatuses: string[]): Promise<Game> {
    return this.createQueryBuilder("game")
      .leftJoinAndSelect("game.lobbies", "lobby")
      .where("game.id = :gameId", { gameId: gameId })
      .andWhere(new Brackets(qb => lobbyStatuses.forEach(status => qb.orWhere("lobby.status = :status", { status: status }))))
      .getOne();
  }

  // updateGameStatus(gameId: number, status: string): Promise<UpdateResult> {
  //   return this.createQueryBuilder("game")
  //     .update(Game)
  //     .set({ status: status })
  //     .where("game.id = :gameId", { gameId: gameId })
  //     .execute();
  // }
}
