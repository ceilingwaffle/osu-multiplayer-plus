import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from "typeorm";
import { AbstractEntity } from "../shared/abstract-entity";
import { TeamScore } from "./team-score.entity";
import { IsInt } from "class-validator";
import { OsuUser } from "../user/osu-user.entity";

@Entity("player_scores")
export class PlayerScore extends AbstractEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @IsInt()
  @Column({ readonly: true })
  score: number;

  @ManyToOne(type => OsuUser, osuUser => osuUser.playerScores)
  scoredBy: OsuUser;

  @ManyToOne(type => TeamScore, teamScore => teamScore.playerScores)
  teamScore: TeamScore;
}
