import { Entity, PrimaryGeneratedColumn, OneToMany, Column, ManyToOne } from "typeorm";
import { AbstractEntity } from "../shared/abstract-entity";
import { PlayerScore } from "./player-score.entity";
import { GameTeam } from "../team/game-team.entity";

@Entity("team_scores")
export class TeamScore extends AbstractEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ readonly: true })
  score: number;

  @ManyToOne(type => GameTeam, gameTeam => gameTeam.teamScores)
  gameTeam: GameTeam;

  @OneToMany(type => PlayerScore, playerScore => playerScore.teamScore)
  playerScores: PlayerScore[];
}
