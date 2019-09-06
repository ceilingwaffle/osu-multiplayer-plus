import { Entity, ManyToOne, Column, OneToMany } from "typeorm";
import { AbstractEntity } from "../shared/abstract-entity";
import { Game } from "../game/game.entity";
import { Team } from "./team.entity";
import { IsPositive, IsInt } from "class-validator";
import { User } from "../user/user.entity";
import { GameDefaults } from "../game/game-defaults";
import { TeamScore } from "../score/team-score.entity";

/**
 * Represents a team assigned to a game.
 * A team can be assigned to multiple games. A game can be assigned multiple teams.
 *
 * @export
 * @class GameTeam
 * @extends {AbstractEntity}
 */
@Entity("games_teams")
export class GameTeam extends AbstractEntity {
  @ManyToOne(type => Team, team => team.gameTeams, { primary: true })
  team: Team;

  @ManyToOne(type => Game, game => game.gameTeams, { primary: true })
  game: Game;

  @IsInt()
  @IsPositive()
  @Column({ default: GameDefaults.teamLives })
  startingLives: number;

  @IsInt()
  @Column({ default: GameDefaults.teamLives })
  currentLives: number;

  @ManyToOne(type => User)
  addedBy: User;

  @ManyToOne(type => User)
  removedBy: User;

  @Column({ nullable: true })
  removedAt: number;
}
