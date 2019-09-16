import { EntityRepository } from "typeorm";
import { AppBaseRepository } from "../shared/app-base-repository";
import { TeamOsuUser } from "./team-osu-user.entity";

@EntityRepository(TeamOsuUser)
export class TeamOsuUserRepository extends AppBaseRepository<TeamOsuUser> {}
