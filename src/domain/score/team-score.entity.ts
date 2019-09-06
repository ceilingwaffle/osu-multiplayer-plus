import { Entity, PrimaryGeneratedColumn, OneToMany, Column, ManyToOne } from "typeorm";
import { AbstractEntity } from "../shared/abstract-entity";
import { PlayerScore } from "./player-score.entity";
import { Match } from "../match/match.entity";

@Entity("team_scores")
export class TeamScore extends AbstractEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(type => Match, match => match.teamScores)
  match: Match;

  @OneToMany(type => PlayerScore, playerScore => playerScore.teamScore)
  playerScores: PlayerScore[];
}
