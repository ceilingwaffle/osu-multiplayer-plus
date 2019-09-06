import { Repository } from "typeorm";
import { Team } from "./team.entity";

export class TeamRepository extends Repository<Team> {
  async findTeamOfOsuUserInGame(osuUser, game) {
    throw new Error("Method not implemented.");
  }
}
