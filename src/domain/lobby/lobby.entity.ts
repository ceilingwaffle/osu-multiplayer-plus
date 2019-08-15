import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, ManyToOne } from "typeorm";
import { IsNumberString, IsPositive, IsInt, IsNotEmpty } from "class-validator";
import { Game } from "../game/game.entity";
import { LobbyStatus } from "./lobby-status";
import { User } from "../user/user.entity";
import { Type } from "class-transformer";
import { AbstractEntity } from "../shared/abstract-entity";
import { IsValidBanchoMultiplayerId } from "../../osu/validators/bancho-multiplayer-id.validator";

@Entity("lobbies")
export class Lobby extends AbstractEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @IsNumberString()
  @Type(() => Number)
  @IsValidBanchoMultiplayerId()
  @Column()
  banchoMultiplayerId: string;

  @IsPositive()
  @IsInt()
  @Column({ default: 1 })
  startingMapNumber: number;

  /**
   * Status of the lobby. Should be in-sync with the Bancho lobby status.
   *
   * @type {string}
   */
  @Column({ default: LobbyStatus.UNKNOWN.getKey() })
  status: string;

  @ManyToMany(type => Game, game => game.lobbies)
  games: Game[];

  @ManyToOne(type => User)
  addedBy: User;
}
