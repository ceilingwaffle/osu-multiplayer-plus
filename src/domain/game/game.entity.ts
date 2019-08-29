import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, JoinTable, OneToMany } from "typeorm";
import { IsInt, IsBoolean } from "class-validator";
import { User } from "../user/user.entity";
import { GameStatus } from "./game-status";
import { AbstractEntity } from "../shared/abstract-entity";
import { GameMessageTarget } from "./game-message-target";
import { UserGameRole } from "../roles/user-game-role.entity";
import { GameLobby } from "./game-lobby.entity";

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

  @OneToMany(type => GameLobby, gameLobby => gameLobby.game, { cascade: true })
  @JoinTable()
  gameLobbies: GameLobby[];

  // @ManyToMany(type => User, user => user.refereeOf)
  // refereedBy: User[];

  @ManyToOne(type => User, user => user.gamesCreated)
  @JoinColumn({ name: "created_by_user_id" })
  createdBy: User;

  // Must be x-to-MANY.
  // Nullable because we need the game ID in order to create a relationship between the game and the UserGameRole, and in order
  // to get a game ID we need to first create the game, therefore the game must first be created momentarily without a UserGameRole.
  @OneToMany(type => UserGameRole, userGameRole => userGameRole.game, { nullable: true })
  userGameRoles: UserGameRole[];

  /**
   * Referees of the game. Initially empty when the game is created. Populated later during the game-creation/update process.
   *
   * @type {User[]}
   */
  refereedBy: User[];
}
