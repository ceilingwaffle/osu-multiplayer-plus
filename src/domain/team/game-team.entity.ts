import { Entity, ManyToOne, Column, OneToMany, JoinColumn, PrimaryGeneratedColumn, Generated, BaseEntity } from "typeorm";
import { CreationTimestampedEntity } from "../shared/creation-timestamped-entity";
import { Game } from "../game/game.entity";
import { Team } from "./team.entity";
import { IsPositive, IsInt, IsHexColor, IsString } from "class-validator";
import { User } from "../user/user.entity";
import { GameDefaults } from "../game/game-defaults";

/**
 * Represents a team assigned to a game.
 * A team can be assigned to multiple games. A game can be assigned multiple teams.
 *
 * @export
 * @class GameTeam
 * @extends {CreationTimestampedEntity}
 */
@Entity("games_teams")
export class GameTeam extends CreationTimestampedEntity {
  // extends BaseEntity
  @Generated()
  id: number;

  @ManyToOne(
    type => Team,
    team => team.gameTeams,
    { primary: true }
  )
  @JoinColumn()
  team: Team;

  @ManyToOne(
    type => Game,
    game => game.gameTeams,
    { primary: true }
  )
  @JoinColumn()
  game: Game;

  @IsInt()
  @IsPositive()
  @Column()
  teamNumber: number;

  @IsInt()
  @IsPositive()
  @Column({ default: GameDefaults.teamLives })
  startingLives: number;

  // @IsInt()
  // @Column({ default: GameDefaults.teamLives })
  // currentLives: number;

  @IsString()
  @Column()
  colorName: string;

  @IsHexColor()
  @Column()
  colorValue: string;

  @ManyToOne(type => User)
  addedBy: User;

  @ManyToOne(type => User)
  removedBy: User;

  // @ValidateIf(gameTeam => gameTeam.removedAt)
  @Column({ name: "removed_at", type: "bigint", unsigned: true, nullable: true })
  removedAt: number;
}
