import { Entity, PrimaryGeneratedColumn, ManyToOne, OneToMany, Column, JoinColumn } from "typeorm";
import { AbstractEntity } from "../shared/abstract-entity";
import { Lobby } from "../lobby/lobby.entity";
import { IsInt, IsPositive } from "class-validator";
import { PlayerScore } from "../score/player-score.entity";

@Entity("matches")
export class Match extends AbstractEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @IsInt()
  @IsPositive()
  @Column()
  mapNumber: number;

  @IsInt()
  @IsPositive()
  @Column()
  beatmapId: string;

  @ManyToOne(type => Lobby, lobby => lobby.matches)
  @JoinColumn()
  lobby: Lobby;

  @OneToMany(type => PlayerScore, playerScore => playerScore.scoredInMatch)
  playerScores: PlayerScore[];
}
