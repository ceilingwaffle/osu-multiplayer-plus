import { Entity, Column, ManyToOne, JoinColumn, Generated } from "typeorm";
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
  @Generated("increment")
  id: number;

  @ManyToOne(type => Team, team => team.teamOsuUsers, { primary: true })
  @JoinColumn()
  team: Team;

  @ManyToOne(type => OsuUser, osuUser => osuUser.teamOsuUsers, { primary: true })
  @JoinColumn()
  osuUser: OsuUser;

  @ManyToOne(type => User, { nullable: false })
  @JoinColumn()
  addedBy: User;

  @Column({ nullable: true })
  removedAt: number;

  @ManyToOne(type => User, { nullable: true })
  @JoinColumn()
  removedBy: User;
}
