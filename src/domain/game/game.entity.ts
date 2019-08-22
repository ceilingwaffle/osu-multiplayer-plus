import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, ManyToMany, JoinTable, OneToMany } from "typeorm";
import { IsInt, IsBoolean } from "class-validator";
import { User } from "../user/user.entity";
import { GameStatus } from "./game-status";
import { Lobby } from "../lobby/lobby.entity";
import { AbstractEntity } from "../shared/abstract-entity";
import { GameMessageTarget } from "./game-message-target";
import { UserGameRole } from "../roles/user-game-role.entity";

@Entity("games")
export class Game extends AbstractEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @IsInt()
  @Column()
  teamLives: number;

  @IsBoolean()
  @Column()
  countFailedScores: boolean;

  @Column("simple-json", { nullable: true })
  messageTargets: GameMessageTarget[];

  @Column({ default: GameStatus.UNKNOWN.getKey() })
  status: string;

  @ManyToOne(type => User)
  @JoinColumn({ name: "ended_by_user_id" })
  endedBy: User;

  @Column({ name: "ended_at", nullable: true })
  endedAt: number;

  @ManyToMany(type => Lobby, lobby => lobby.games)
  @JoinTable()
  lobbies: Lobby[];

  // @ManyToMany(type => User, user => user.refereeOf)
  // refereedBy: User[];

  // @ManyToOne(type => User, user => user.gamesCreated)
  // @JoinColumn({ name: "created_by_user_id" })
  // createdBy: User;

  // // Must be x-to-MANY.
  // // Nullable because we need the game ID in order to create a relationship between the game and the UserGameRole, and in order
  // // to get a game ID we need to first create the game, therefore the game must first be created momentarily without a UserGameRole.
  // @OneToMany(type => UserGameRole, userGameRole => userGameRole.game, { nullable: true })
  // userGameRoles: UserGameRole[];
}

// @ManyToOne(type => GameStatus, gameStatus => gameStatus.games)
// @JoinColumn({ name: "game_status_id" })
// status: GameStatus;
