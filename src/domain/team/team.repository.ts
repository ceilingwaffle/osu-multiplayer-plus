import { Repository, EntityRepository } from "typeorm";
import { Team } from "./team.entity";
import { AppBaseRepository } from "../shared/app-base-repository";

@EntityRepository(Team)
export class TeamRepository extends AppBaseRepository<Team> {
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
    const teams: Team[] = await this.findByIdsWithRelations({ ids: teamIds });
    return teams;
  }

  /**
   * Returns teams matching any of the given team ids
   *
   * @param {number[]} ids Team entity ID's
   * @param {string[]} [returnWithRelations]
   * @returns {Promise<Team[]>}
   */
  findByIdsWithRelations({
    ids,
    returnWithRelations = ["teamOsuUsers", "teamOsuUsers.team", "teamOsuUsers.osuUser", "teamOsuUsers.addedBy", "teamOsuUsers.removedBy"]
  }: {
    ids: number[];
    returnWithRelations?: string[];
  }): Promise<Team[]> {
    return this.findByIds(ids, { relations: returnWithRelations });
  }

  /**
   * Finds the teams consisting of user users matching the exact groups of user ids provided.
   *
   * @param {number[][]} userIdGroups
   * @returns {(Promise<number[]>)}
   */
  private async findTeamIdsOfBanchoOsuUserIdGroups(userIdGroups: number[][]): Promise<number[]> {
    // TODO: Chunk this to avoid SQL column index out of range error
    const params = [];
    let query =
      "SELECT teams.id\
    FROM teams_osu_users tou1\
    INNER JOIN osu_users ou ON tou1.osuUserId = ou.id\
    INNER JOIN teams ON teams.id = tou1.teamId\
    WHERE 1 != 1 ";
    for (const userIdGroup of userIdGroups) {
      query = query.concat(`OR ou.osuUserId IN (${buildParameterHolders(userIdGroup)}) `);
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
function buildParameterHolders(userIdGroup: number[]) {
  return userIdGroup.map(uid => "?").join(", ");
}
