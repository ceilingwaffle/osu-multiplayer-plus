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

  findOsuUsersInGame(gameId: number): Promise<OsuUser[]> {
    return this.createQueryBuilder("osuUser")
      .leftJoinAndSelect("osuUser.teamOsuUsers", "teamOsuUsers")
      .leftJoinAndSelect("teamOsuUsers.team", "team")
      .leftJoinAndSelect("team.gameTeams", "gameTeams")
      .leftJoinAndSelect("gameTeams.game", "game")
      .where("game.id = :gameId", { gameId: gameId })
      .getMany();
    // return this.createQueryBuilder("game")
    //   .leftJoinAndSelect("game.gameTeams", "gameTeams")
    //   .leftJoinAndSelect("gameTeams.team", "team")
    //   .leftJoinAndSelect("team.teamOsuUsers", "teamOsuUsers")
    //   .leftJoinAndSelect("teamOsuUsers.osuUser", "osuUser")
    //   .where("game.id := gameId", { gameId: gameId })
    //   .getMany();
  }
}
