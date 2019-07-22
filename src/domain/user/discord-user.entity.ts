import { Entity, OneToOne, PrimaryColumn, PrimaryGeneratedColumn, Column, JoinColumn } from "typeorm";
import { User } from "./user.entity";

@Entity("discord_users")
export class DiscordUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  discordUserId: string;

  @OneToOne(type => User, user => user.discordUser)
  @JoinColumn()
  user: User;
}
