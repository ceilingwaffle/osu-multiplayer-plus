import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, ManyToMany, JoinTable, OneToMany } from "typeorm";
import { Lobby } from "../lobby/lobby.entity";
import { AbstractEntity } from "../shared/abstract-entity";
import { IsPositive, IsInt } from "class-validator";
import { User } from "../user/user.entity";
import { Game } from "./game.entity";

@Entity("game_lobbies")
export class GameLobby extends AbstractEntity {
  @ManyToOne(type => Lobby, lobby => lobby.gameLobbies, { primary: true })
  lobby: Lobby;

  @ManyToOne(type => Game, game => game.gameLobbies, { primary: true })
  game: Game;

  @IsPositive()
  @IsInt()
  @Column({ default: 1 })
  startingMapNumber: number;

  /**
   * Has a value if the lobby was "removed" from the game.
   * e.g. using the `!obr removelobby` Discord command would set this value to some timestamp.
   *
   * @type {number}
   */
  @Column({ nullable: true })
  removedAt: number;

  @ManyToOne(type => User)
  removedBy: User;

  @ManyToOne(type => User)
  addedBy: User;
}
