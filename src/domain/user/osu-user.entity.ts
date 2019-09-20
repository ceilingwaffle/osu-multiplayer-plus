import { CreationTimestampedEntity } from "../shared/creation-timestamped-entity";
import { Entity, PrimaryGeneratedColumn, OneToOne, Column, OneToMany, ManyToMany, JoinColumn } from "typeorm";
import { User } from "./user.entity";
import { IsInt, IsPositive, Length, IsAlpha, ValidateIf } from "class-validator";
import { PlayerScore } from "../score/player-score.entity";
import { TeamOsuUser } from "../team/team-osu-user.entity";

@Entity("osu_users")
export class OsuUser extends CreationTimestampedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(type => User, user => user.osuUser, { cascade: ["insert", "update"] })
  @JoinColumn()
  user: User;

  @IsInt()
  @IsPositive()
  // TODO: @IsValidOsuUserId()
  @Column({ unique: true })
  osuUserId: string;

  // TODO: @IsValidOsuUsername()
  @Column()
  osuUsername: string;

  /**
   * The ISO 3166-1 alpha-2 country code: https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2
   *
   * TODO: Use https://www.npmjs.com/package/iso-3166-1-alpha-2
   *
   * @type string
   * @memberof OsuUser
   */
  @ValidateIf(osuUser => osuUser.countryCode)
  @Length(2)
  @IsAlpha()
  @Column({ length: 2, nullable: true })
  countryCode: string;

  @OneToMany(type => TeamOsuUser, teamOsuUser => teamOsuUser.osuUser)
  teamOsuUsers: TeamOsuUser[];

  @OneToMany(type => PlayerScore, playerScore => playerScore.scoredBy)
  playerScores: PlayerScore[];
}
