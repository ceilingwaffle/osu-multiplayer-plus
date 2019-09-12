import { Repository, EntityRepository } from "typeorm";
import { OsuUser } from "./osu-user.entity";
import { Log } from "../../utils/Log";

@EntityRepository(OsuUser)
export class OsuUserRepository extends Repository<OsuUser> {
  findByBanchoUserIds(banchoUserIds: number[]): Promise<OsuUser[]> {
    try {
      return (
        this.createQueryBuilder("osuUser")
          // .leftJoin("osuUser.teamOsuUsers", "teamOsuUsers")
          // .leftJoin("teamOsuUsers.team", "team")
          // .leftJoin("team.gameTeams", "gameTeams")
          // .leftJoin("gameTeams.addedBy", "gameTeamAddedBy")
          .where("osuUser.osuUserId IN (:...banchoUserIds)", { banchoUserIds: banchoUserIds.map(id => id.toString()) })
          .orderBy("osuUser.id", "ASC")
          .getMany()
      );
    } catch (error) {
      Log.methodError(this.findByBanchoUserIds, this.constructor.name, error);
      throw error;
    }
  }
}
