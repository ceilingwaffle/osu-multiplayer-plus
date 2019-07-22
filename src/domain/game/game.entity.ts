import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { IsInt, IsBoolean } from "class-validator";
import { User } from "../user/user.entity";
import { GameStatus } from "./game-status.entity";
import { RequestDto } from "../../requests/dto";
import { CommunicationClientType } from "../../requests/dto/request.dto";

@Entity("game")
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
  messageTargets: { type: CommunicationClientType; channel: string }[];

  @Column()
  @ManyToOne(type => User, user => user.gamesCreated)
  @JoinColumn({ name: "created_by_user_id" })
  createdBy: User;

  @ManyToOne(type => GameStatus, gameStatus => gameStatus.games)
  @JoinColumn({ name: "game_status_id" })
  status: GameStatus;
}
