import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { IsInt, IsBoolean } from "class-validator";

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
}
