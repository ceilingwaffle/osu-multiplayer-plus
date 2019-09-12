import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { User } from "../user/user.entity";
import { CreationTimestampedEntity } from "../shared/creation-timestamped-entity";
import { IsAlphanumeric, ValidateIf } from "class-validator";
import { GameTeam } from "./game-team.entity";
import { TeamOsuUser } from "./team-osu-user.entity";

@Entity("teams")
export class Team extends CreationTimestampedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ValidateIf(team => team.name)
  @IsAlphanumeric()
  @Column({ nullable: true })
  name: string;

  @ManyToOne(type => User)
  @JoinColumn({ name: "created_by_user_id" })
  createdBy: User;

  @OneToMany(type => TeamOsuUser, teamOsuUser => teamOsuUser.team)
  teamOsuUsers: TeamOsuUser[];

  @OneToMany(type => GameTeam, gameTeam => gameTeam.team)
  gameTeams: GameTeam[];
}
