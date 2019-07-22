import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, ManyToMany } from "typeorm";
import { IsInt, IsBoolean } from "class-validator";
import { User } from "../user/user.entity";
import { CommunicationClientType } from "../../requests/dto/request.dto";
import { GameStatusType } from "./types/game-status-type";

@Entity("games")
export class Game {
  @PrimaryGeneratedColumn()
  id: number;

  @IsInt()
  @Column()
  teamLives: number;

  @IsBoolean()
  @Column()
  countFailedScores: boolean;

  @Column("simple-json")
  messageTargets: { type: CommunicationClientType; authorId: string; channel: string }[];

  @ManyToOne(type => User, user => user.gamesCreated)
  @JoinColumn({ name: "created_by_user_id" })
  createdBy: User;

  // @ManyToOne(type => GameStatus, gameStatus => gameStatus.games)
  // @JoinColumn({ name: "game_status_id" })
  // status: GameStatus;

  @Column({ default: GameStatusType.UNKNOWN })
  status: GameStatusType;

  @ManyToMany(type => User, user => user.refereeOf)
  refereedBy: User[];
}
