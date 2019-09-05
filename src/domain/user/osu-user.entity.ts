import { AbstractEntity } from "../shared/abstract-entity";
import { Entity, PrimaryGeneratedColumn, OneToOne, Column } from "typeorm";
import { User } from "./user.entity";
import { IsInt, IsPositive, Length, IsAlpha } from "class-validator";

@Entity("osu_users")
export class OsuUser extends AbstractEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(type => User, user => user.osuUser)
  user: User;

  @IsInt()
  @IsPositive()
  @Column()
  osuUserId: string;

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
  @Length(2)
  @IsAlpha()
  @Column({ length: 2 })
  countryCode: string;
}
