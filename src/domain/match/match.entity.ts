import { Entity, PrimaryGeneratedColumn, ManyToOne, OneToMany, Column, JoinColumn } from "typeorm";
import { CreationTimestampedEntity } from "../shared/creation-timestamped-entity";
import { Lobby } from "../lobby/lobby.entity";
import { IsInt, IsPositive } from "class-validator";
import { PlayerScore } from "../score/player-score.entity";

@Entity("matches")
export class Match extends CreationTimestampedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /** The order in which the map was played for a given lobby. */
  @IsInt()
  @IsPositive()
  @Column()
  mapNumber: number;

  @IsInt()
  @IsPositive()
  @Column()
  beatmapId: string;

  @IsInt()
  @IsPositive()
  @Column()
  startTime: number;

  @IsInt()
  @IsPositive()
  @Column({ nullable: true })
  endTime: number;

  @Column({ default: false })
  aborted: boolean;

  @Column({ default: false })
  ignored: boolean;

  @IsInt()
  @Column()
  teamMode: number;

  @ManyToOne(type => Lobby, lobby => lobby.matches)
  @JoinColumn()
  lobby: Lobby;

  @OneToMany(type => PlayerScore, playerScore => playerScore.scoredInMatch, { cascade: ["insert", "update"] })
  playerScores: PlayerScore[];
}
