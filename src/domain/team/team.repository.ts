import { Repository, EntityRepository, Brackets } from "typeorm";
import { Team } from "./team.entity";

@EntityRepository(Team)
export class TeamRepository extends Repository<Team> {
  /**
   * Finds the teams consisting of user users matching the exact groups of user ids provided.
   *
   * @param {number[][]} userIdGroups
   * @returns {(Team[] | PromiseLike<Team[]>)}
   */
  findTeamsOfBanchoOsuUserIdGroups(userIdGroups: number[][]): Team[] | PromiseLike<Team[]> {
    let qb = this.createQueryBuilder("team")
      .leftJoinAndSelect("team.teamOsuUsers", "teamOsuUser")
      .leftJoinAndSelect("teamOsuUser.osuUser", "osuUser")
      .where("1 = 1");

    qb.andWhere(
      new Brackets(qb => {
        qb = qb.where("1 = 1");
        for (const userIdGroup of userIdGroups) {
          qb = qb.orWhere("osuUser.osuUserId IN (:...userIdGroup)", { userIdGroup: userIdGroup });
        }
      })
    );

    return qb.getMany();
  }
}
