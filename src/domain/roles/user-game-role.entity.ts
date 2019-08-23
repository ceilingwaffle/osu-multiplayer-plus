import { Entity, PrimaryColumn, ManyToOne, Column, PrimaryGeneratedColumn, OneToMany, ManyToMany } from "typeorm";
import { AbstractEntity } from "../shared/abstract-entity";
import { User } from "../user/user.entity";
import { Game } from "../game/game.entity";
import { Role } from "./role.type";

/**
 * A user may have a role for a game (e.g. referee). Composite key composed from User and Game to enforce only one role per User per Game allowed.
 * e.g. User 1 cannot have the role of both a game-creator and a referee for game 1.
 *
 * @export
 * @class UserGameRole
 * @extends {AbstractEntity}
 */
@Entity("user_game_role")
export class UserGameRole extends AbstractEntity {
  @ManyToOne(type => User, user => user.userGameRoles, { primary: true })
  user: User;

  @ManyToOne(type => Game, game => game.userGameRoles, { primary: true })
  game: Game;

  @Column()
  role: Role;
}
