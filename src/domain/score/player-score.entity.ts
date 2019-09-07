import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, JoinColumn } from "typeorm";
import { AbstractEntity } from "../shared/abstract-entity";
import { IsInt } from "class-validator";
import { OsuUser } from "../user/osu-user.entity";
import { Match } from "../match/match.entity";

@Entity("player_scores")
export class PlayerScore extends AbstractEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @IsInt()
  @Column({ readonly: true })
  score: number;

  @ManyToOne(type => OsuUser) // , osuUser => osuUser.playerScores
  @JoinColumn({ name: "scored_by_osu_user_id" })
  scoredBy: OsuUser;

  @ManyToOne(type => Match)
  @JoinColumn({ name: "scored_in_match_id" })
  scoredInMatch: Match;
}
