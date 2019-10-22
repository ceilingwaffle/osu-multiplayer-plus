import { Entity, PrimaryGeneratedColumn, ManyToOne, OneToMany, Column, JoinColumn, Unique, JoinTable } from "typeorm";
import { CreationTimestampedEntity } from "../shared/creation-timestamped-entity";
import { Lobby } from "../lobby/lobby.entity";
import { IsInt, IsPositive, IsNumberString, ValidateIf } from "class-validator";
import { PlayerScore } from "../score/player-score.entity";
import { GameMatchReported } from "../game/game-match-reported.entity";

@Entity("matches")
export class Match extends CreationTimestampedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /** The order in which the map was played for a given lobby. */
  @IsInt()
  @IsPositive()
  @Column()
  mapNumber: number;

  @IsNumberString()
  @IsPositive()
  @Column()
  beatmapId: string;

  /** The start-time timestamp in milliseconds */
  @IsInt()
  @IsPositive()
  @Column({ type: "bigint", unsigned: true })
  startTime: number;

  /** The end-time timestamp in milliseconds (null if match has not yet been recorded as ended) */
  @ValidateIf(match => match.endTime)
  @IsInt()
  @IsPositive()
  @Column({ type: "bigint", unsigned: true, nullable: true })
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

  @OneToMany(type => GameMatchReported, gameMatchReported => gameMatchReported.match)
  @JoinTable()
  gameMatchesReported: GameMatchReported[];
}
