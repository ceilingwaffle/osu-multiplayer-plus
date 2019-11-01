import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, JoinColumn } from "typeorm";
import { CreationTimestampedEntity } from "../shared/creation-timestamped-entity";
import { IsInt, IsEnum, Validate, Min, Max } from "class-validator";
import { OsuUser } from "../user/osu-user.entity";
import { Match } from "../match/match.entity";
import { ScoreLetterGrade } from "../../multiplayer/components/types/score-letter-grade";

@Entity("player_scores")
export class PlayerScore extends CreationTimestampedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ readonly: true, nullable: false })
  score: number;

  // TODO: Validate
  @Column()
  scoreLetterGrade: ScoreLetterGrade;

  @Min(0)
  @Max(100)
  @Column("decimal", { precision: 5, scale: 2 }) // Decimal stores values between -999.999 to 999.999 (which includes our needed ranged for accuracy between 0.0 and 100.0)
  accuracy: number;

  @ManyToOne(type => OsuUser, { cascade: ["insert", "update"] }) // , osuUser => osuUser.playerScores
  @JoinColumn({ name: "scored_by_osu_user_id" })
  scoredBy: OsuUser;

  @ManyToOne(type => Match)
  @JoinColumn({ name: "scored_in_match_id" })
  scoredInMatch: Match;

  @Column({ default: false, nullable: false })
  ignored: boolean;

  @Column({ readonly: true, nullable: false })
  passed: boolean;
}
