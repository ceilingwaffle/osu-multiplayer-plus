import { Entity, Column, ManyToOne } from "typeorm";
import { AbstractEntity } from "../shared/abstract-entity";
import { Team } from "./team.entity";
import { OsuUser } from "../user/osu-user.entity";
import { User } from "../user/user.entity";

/**
 * The teams that osu users are assigned to. Many osu users may belong to many teams.
 *
 * Related to OsuUser instead of User because a Team under this definition is a team setting scores in an osu multiplayer lobby
 *
 * @export
 * @class TeamOsuUser
 * @extends {AbstractEntity}
 */
@Entity("teams_osu_users")
export class TeamOsuUser extends AbstractEntity {
  @ManyToOne(type => Team)
  team: Team;

  @ManyToOne(type => OsuUser)
  osuUser: OsuUser;

  @ManyToOne(type => User)
  addedBy: User;

  @ManyToOne(type => User)
  removedBy: User;

  @Column()
  removedAt: number;
}
