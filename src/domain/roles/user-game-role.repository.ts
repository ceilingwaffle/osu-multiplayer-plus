import { UserGameRole } from "./user-game-role.entity";
import { EntityRepository, Repository } from "typeorm";
import { User } from "../user/user.entity";
import { gameAdminRoles } from "./role.type";

@EntityRepository(UserGameRole)
export class UserGameRoleRepository extends Repository<UserGameRole> {
  /**
   * Returns any users considered "referees" of the given game ID. What is considered a referee is defined by roles listed in the file "role.type.ts".
   *
   * @param {number} gameId
   * @returns {Promise<User[]>}
   */
  async getGameReferees(gameId: number): Promise<User[]> {
    const refRoles = gameAdminRoles.map(role => role.valueOf());

    const userGameRoles = await this.createQueryBuilder("user_game_role")
      .leftJoinAndSelect("user_game_role.game", "game")
      .leftJoinAndSelect("user_game_role.user", "user")
      .leftJoinAndSelect("user.discordUser", "discordUser")
      .where("game.id = :gameId", { gameId: gameId })
      .andWhere("user_game_role.role IN (:...refRoles)", { refRoles: refRoles })
      .getMany();

    const refs = userGameRoles.map(ugr => ugr.user);

    return refs;
  }
}
