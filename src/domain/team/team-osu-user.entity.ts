import { Entity, Column, ManyToOne } from "typeorm";
import { CreationTimestampedEntity } from "../shared/creation-timestamped-entity";
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
 * @extends {CreationTimestampedEntity}
 */
@Entity("teams_osu_users")
export class TeamOsuUser extends CreationTimestampedEntity {
  @ManyToOne(type => Team, { primary: true })
  team: Team;

  @ManyToOne(type => OsuUser, { primary: true })
  osuUser: OsuUser;

  @ManyToOne(type => User)
  addedBy: User;

  @ManyToOne(type => User)
  removedBy: User;

  @Column()
  removedAt: number;
}
