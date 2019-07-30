import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, JoinColumn, ManyToMany, JoinTable } from "typeorm";
import { IsInt, IsBoolean } from "class-validator";
import { Game } from "../game/game.entity";
import { DiscordUser } from "./discord-user.entity";
import { AbstractEntity } from "../shared/abstract-entity";
import { WebUser } from "./web-user.entity";

@Entity("users")
export class User extends AbstractEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(type => Game, game => game.createdBy)
  gamesCreated: Game[];

  @OneToOne(type => DiscordUser, discordUser => discordUser.user, {
    cascade: ["insert", "update", "remove"],
    nullable: true
  })
  discordUser: DiscordUser;

  @OneToOne(type => WebUser, webUser => webUser.user, {
    cascade: ["insert", "update", "remove"],
    nullable: true
  })
  webUser: WebUser;

  @ManyToMany(type => Game, user => user.refereedBy, {
    cascade: [],
    nullable: true
  })
  @JoinTable()
  refereeOf: Game[];
}
