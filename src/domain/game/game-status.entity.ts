import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { GameStatusType } from "./types/game-status.type";
import { Game } from "./game.entity";

@Entity()
export class GameStatus {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: "enum",
    enum: GameStatusType,
    default: GameStatusType.UNKNOWN
  })
  text: GameStatusType;

  @OneToMany(type => Game, game => game.status)
  games: Game[];
}
