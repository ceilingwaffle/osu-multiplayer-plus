import { Repository, EntityRepository } from "typeorm";
import { Team } from "./team.entity";

@EntityRepository(Team)
export class TeamRepository extends Repository<Team> {
  /**
   * Returns teams where a team exists comprised of the exact specific users in one of the userIdGroups.
   *
   * @param {number[][]} userIdGroups 2D array of Bancho osu user IDs
   * @returns {Promise<Team[]>}
   */
  async findTeamsOfBanchoOsuUserIdGroups(userIdGroups: number[][]): Promise<Team[]> {
    // TODO - Optimize. Might be possible to do this in a single query, but right now I'm not sure how to return a raw SQL query result as
    //        an array of Team entities with all relationships included as nested properties, so for now we just get the team ids (query 1),
    //        then reload them using a normal TypeORM query (query 2).
    const teamIds: number[] = await this.findTeamIdsOfBanchoOsuUserIdGroups(userIdGroups);
    const teams: Team[] = await this.findByIdsWithRelations(teamIds);
    return teams;
  }

  /**
   * Returns teams matching any of the given team ids
   *
   * @param {number[]} ids Team entity ID's
   * @param {string[]} [returnWithRelations]
   * @returns {Promise<Team[]>}
   */
  findByIdsWithRelations(
    ids: number[],
    returnWithRelations: string[] = [
      "teamOsuUsers",
      "teamOsuUsers.team",
      "teamOsuUsers.osuUser",
      "teamOsuUsers.addedBy",
      "teamOsuUsers.removedBy"
    ]
  ): Promise<Team[]> {
    return this.findByIds(ids, { relations: returnWithRelations });
  }

  /**
   * Finds the teams consisting of user users matching the exact groups of user ids provided.
   *
   * @param {number[][]} userIdGroups
   * @returns {(Promise<number[]>)}
   */
  private async findTeamIdsOfBanchoOsuUserIdGroups(userIdGroups: number[][]): Promise<number[]> {
    const params = [];
    let query =
      "SELECT t.id\
    FROM teams_osu_users tou1\
    INNER JOIN osu_users ou ON tou1.osuUserId = ou.id\
    INNER JOIN teams t ON t.id = tou1.teamId\
    WHERE 1 != 1 ";
    for (const userIdGroup of userIdGroups) {
      query += "OR ou.osuUserId IN (?,?) ";
      for (const userId of userIdGroup) params.push(userId.toString());
    }
    query +=
      "\
    GROUP BY tou1.teamId\
    HAVING COUNT(*) =\
    (\
      SELECT COUNT(*)\
      FROM teams_osu_users tou2\
      WHERE tou2.teamId = tou1.teamId\
      GROUP BY tou2.teamId\
    )";
    const result = await this.query(query, params);
    return result;
  }
}
