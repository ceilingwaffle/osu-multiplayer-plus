import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
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
  @JoinColumn()
  team: Team;

  @ManyToOne(type => OsuUser, { primary: true })
  @JoinColumn()
  osuUser: OsuUser;

  @ManyToOne(type => User)
  @JoinColumn()
  addedBy: User;

  @Column({ nullable: true })
  removedAt: number;

  @ManyToOne(type => User)
  @JoinColumn()
  removedBy: User;
}
