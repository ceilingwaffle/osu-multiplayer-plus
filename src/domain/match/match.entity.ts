import { Entity, PrimaryGeneratedColumn, ManyToOne, OneToMany, Column, JoinColumn, Unique, JoinTable, OneToOne, BaseEntity } from "typeorm";
import { CreationTimestampedEntity } from "../shared/creation-timestamped-entity";
import { Lobby } from "../lobby/lobby.entity";
import { IsInt, IsPositive, IsNumberString, ValidateIf } from "class-validator";
import { PlayerScore } from "../score/player-score.entity";
import { MatchAborted } from "./match-aborted.entity";
import { Beatmap } from "../beatmap/beatmap.entity";

@Entity("matches")
export class Match extends BaseEntity {
  // extends CreationTimestampedEntity
  @PrimaryGeneratedColumn()
  id: number;

  /** The order in which the map was played for a given lobby. */
  @IsInt()
  @IsPositive()
  @Column()
  mapNumber: number;

  // // TODO - remove usage of Match(entity).beatmapId (just use Beatmap prop) - we have beatmapId listed along with Beatmap redundantly just to save dev time instead of rewriting the tests
  // @IsNumberString()
  // @IsPositive()
  // @Column()
  // beatmapId: string;

  @ManyToOne(
    type => Beatmap,
    beatmap => beatmap.matches,
    { cascade: ["insert", "update"] }
  )
  beatmap: Beatmap;

  /**
   * The start-time timestamp in milliseconds.
   *
   * Bigint stored as string in Postgres.
   * Must use non-strict equality operator (==) to compare to a number in JS.
   * Ref: https://github.com/typeorm/typeorm/issues/873
   */
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

  @OneToOne(
    type => MatchAborted,
    matchAborted => matchAborted.match,
    { cascade: ["insert", "update"] }
  )
  @JoinColumn()
  matchAbortion: MatchAborted;

  /** e.g. if the map was a warmup and should not be included in the leaderboard calculations */
  @Column({ default: false })
  ignored: boolean;

  @IsInt()
  @Column()
  teamMode: number;

  @ManyToOne(
    type => Lobby,
    lobby => lobby.matches
  )
  @JoinColumn()
  lobby: Lobby;

  @OneToMany(
    type => PlayerScore,
    playerScore => playerScore.scoredInMatch,
    { cascade: ["insert", "update"] }
  )
  playerScores: PlayerScore[];
}
