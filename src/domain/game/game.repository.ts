import { Repository, EntityRepository, Brackets, UpdateResult, SelectQueryBuilder } from "typeorm";
import { Game } from "./game.entity";
import { Lobby } from "../lobby/lobby.entity";
import { User } from "../user/user.entity";

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
   * Finds a game matching the given game id, and includes any lobbies of that game matching the given lobby statuses.
   *
   * @param {number} gameId
   * @param {string[]} lobbyStatuses
   * @returns {Promise<Game>}
   */
  findGameAndIncludeLobbiesWithStatus(gameId: number, lobbyStatuses: string[]): Promise<Game> {
    return this.getFindGameQb(gameId)
      .leftJoinAndSelect(subquery => {
        return subquery
          .from(Lobby, "lobby")
          .where(new Brackets(qb => lobbyStatuses.forEach(status => qb.orWhere("lobby.status = :status", { status: status }))));
      }, "lobbies")
      .getOne();
  }

  findGame(gameId: number): Promise<Game> {
    return this.getFindGameQb(gameId).getOne();
  }

  private getFindGameQb(gameId: number): SelectQueryBuilder<Game> {
    return this.createQueryBuilder("game")
      .select()
      .leftJoinAndSelect("game.createdBy", "createdBy")
      .leftJoinAndSelect("createdBy.discordUser", "discordUser_createdBy")
      .leftJoinAndSelect("game.endedBy", "endedBy")
      .leftJoinAndSelect("endedBy.discordUser", "discordUser_endedBy")
      .leftJoinAndSelect("game.refereedBy", "refereedBy")
      .leftJoinAndSelect("refereedBy.discordUser", "discordUser_refereedBy")
      .where("game.id = :gameId", { gameId: gameId });
    // .leftJoinAndSelect("createdBy.webUser", "webUser_createdBy")
    // .leftJoinAndSelect("endedBy.webUser", "webUser_endedBy")
    // .leftJoinAndSelect("refereedBy.webUser", "webUser_refereedBy")
  }

  // updateGameStatus(gameId: number, status: string): Promise<UpdateResult> {
  //   return this.createQueryBuilder("game")
  //     .update(Game)
  //     .set({ status: status })
  //     .where("game.id = :gameId", { gameId: gameId })
  //     .execute();
  // }
}
