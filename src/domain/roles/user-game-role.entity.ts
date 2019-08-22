import { Entity, PrimaryColumn, ManyToOne, Column, PrimaryGeneratedColumn, OneToMany, ManyToMany } from "typeorm";
import { AbstractEntity } from "../shared/abstract-entity";
import { User } from "../user/user.entity";
import { Game } from "../game/game.entity";
import { Role } from "./role.type";

@Entity("user_game_role")
export class UserGameRole extends AbstractEntity {
  @ManyToOne(type => User, user => user.userGameRoles, { primary: true })
  user: User;

  @ManyToOne(type => Game, { primary: true }) // , game => game.userGameRoles,
  game: Game;

  @Column()
  role: Role;
}

// Many users have one user-game-role
// Many games have many user-game-roles
