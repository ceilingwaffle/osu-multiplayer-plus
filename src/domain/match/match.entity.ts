import { Entity, PrimaryGeneratedColumn, ManyToOne, OneToMany, Column, JoinColumn } from "typeorm";
import { CreationTimestampedEntity } from "../shared/creation-timestamped-entity";
import { Lobby } from "../lobby/lobby.entity";
import { IsInt, IsPositive } from "class-validator";
import { PlayerScore } from "../score/player-score.entity";

@Entity("matches")
export class Match extends CreationTimestampedEntity {
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

  @Column({ default: false })
  aborted: boolean;

  @Column({ default: false })
  ignored: boolean;

  @ManyToOne(type => Lobby, lobby => lobby.matches)
  @JoinColumn()
  lobby: Lobby;

  @OneToMany(type => PlayerScore, playerScore => playerScore.scoredInMatch)
  playerScores: PlayerScore[];
}
