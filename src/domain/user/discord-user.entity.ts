import { Entity, OneToOne, PrimaryColumn, PrimaryGeneratedColumn, Column, JoinColumn } from "typeorm";
import { User } from "./user.entity";

@Entity("discordUser")
export class DiscordUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  discordUserId: string;

  @OneToOne(type => User, user => user.discordUser)
  @JoinColumn()
  user: User;
}
