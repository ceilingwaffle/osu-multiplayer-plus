import { Entity, OneToOne, PrimaryColumn, PrimaryGeneratedColumn, Column } from "typeorm";
import { User } from "./user.entity";

@Entity("discordUser")
export class DiscordUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  discordUserId: string;

  @OneToOne(type => User, user => user.discordUser)
  user: User;
}
