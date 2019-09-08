import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, JoinColumn, ManyToMany, JoinTable, ManyToOne } from "typeorm";
import { Game } from "../game/game.entity";
import { DiscordUser } from "./discord-user.entity";
import { CreationTimestampedEntity } from "../shared/creation-timestamped-entity";
import { WebUser } from "./web-user.entity";
import { UserGameRole } from "../role/user-game-role.entity";
import { OsuUser } from "./osu-user.entity";

@Entity("users")
export class User extends CreationTimestampedEntity {
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

  @OneToOne(type => OsuUser, osuUser => osuUser.user)
  osuUser: OsuUser;
}
