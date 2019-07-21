import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, JoinColumn } from "typeorm";
import { IsInt, IsBoolean } from "class-validator";
import { Game } from "../game/game.entity";
import { DiscordUser } from "./discord-user.entity";

@Entity("user")
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(type => Game, game => game.createdBy)
  gamesCreated: Game[];

  @OneToOne(type => DiscordUser, discordUser => discordUser.user, {
    cascade: true,
    nullable: true
  })
  discordUser: DiscordUser;
}
