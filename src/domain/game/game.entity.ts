import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, JoinTable, OneToMany } from "typeorm";
import { IsInt, IsBoolean, IsPositive } from "class-validator";
import { User } from "../user/user.entity";
import { GameStatus } from "./game-status";
import { CreationTimestampedEntity } from "../shared/creation-timestamped-entity";
import { GameMessageTarget } from "./game-message-target";
import { UserGameRole } from "../role/user-game-role.entity";
import { GameLobby } from "./game-lobby.entity";
import { GameTeam } from "../team/game-team.entity";

@Entity("games")
export class Game extends CreationTimestampedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @IsInt()
  @IsPositive()
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

  @ManyToOne(type => User, user => user.gamesCreated)
  @JoinColumn({ name: "created_by_user_id" })
  createdBy: User;

  // Must be x-to-MANY.
  // Nullable because we need the game ID in order to create a relationship between the game and the UserGameRole, and in order
  // to get a game ID we need to first create the game, therefore the game must first be created momentarily without a UserGameRole.
  @OneToMany(type => UserGameRole, userGameRole => userGameRole.game, { nullable: true })
  userGameRoles: UserGameRole[];

  @OneToMany(type => GameTeam, gameTeam => gameTeam.game)
  gameTeams: GameTeam[];
}
