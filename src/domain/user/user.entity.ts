import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, JoinColumn, ManyToMany, JoinTable, ManyToOne } from "typeorm";
import { IsInt, IsBoolean } from "class-validator";
import { Game } from "../game/game.entity";
import { DiscordUser } from "./discord-user.entity";
import { AbstractEntity } from "../shared/abstract-entity";
import { WebUser } from "./web-user.entity";
import { UserGameRole } from "../role/user-game-role.entity";
import { Team } from "../team/team.entity";

@Entity("users")
export class User extends AbstractEntity {
  @PrimaryGeneratedColumn()
  id: number;

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

  @OneToMany(type => Game, game => game.createdBy)
  gamesCreated: Game[];

  @OneToMany(type => UserGameRole, userGameRole => userGameRole.user)
  userGameRoles: UserGameRole[];

  @ManyToMany(type => Team, team => team.users)
  teams: Team[];
}
